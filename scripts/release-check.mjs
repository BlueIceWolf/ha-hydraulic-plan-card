import { access, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const readText = (path) => readFile(resolve(root, path), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const [packageText, hacsText, distText, changelog] = await Promise.all([
  readText('package.json'),
  readText('hacs.json'),
  readText('dist/heatpump-hydraulic-card.js'),
  readText('CHANGELOG.md'),
]);

const packageJson = JSON.parse(packageText);
const hacs = JSON.parse(hacsText);
const failures = [];
const versionMatch = distText.match(/const HFC_VERSION = ['"]([^'"]+)['"]/);
const cardVersion = versionMatch?.[1];

if (!cardVersion) failures.push('HFC_VERSION is missing from the distribution file.');
if (cardVersion && cardVersion !== packageJson.version) {
  failures.push(`package.json is ${packageJson.version}, but HFC_VERSION is ${cardVersion}.`);
}

try {
  await access(resolve(root, 'dist', hacs.filename));
} catch {
  failures.push(`hacs.json points to missing dist/${hacs.filename}.`);
}

const versionHeading = new RegExp(`^## ${escapeRegExp(packageJson.version)}(?:\\s|$)`, 'm');
if (!versionHeading.test(changelog)) {
  failures.push(`CHANGELOG.md has no heading for ${packageJson.version}.`);
}

let tag;
if (process.env.GITHUB_REF_TYPE === 'tag') tag = process.env.GITHUB_REF_NAME;
else if (process.env.GITHUB_REF?.startsWith('refs/tags/')) tag = process.env.GITHUB_REF.slice(10);
if (tag && tag !== `v${packageJson.version}`) {
  failures.push(`Tag ${tag} does not match v${packageJson.version}.`);
}

// Changelog fragments must be bullet lists. A release must not leave any behind: they would be missing from the changelog.
const fragments = (await readdir(resolve(root, 'changelog.d'))).filter((n) => n.endsWith('.md') && n !== 'README.md');
for (const name of fragments) {
  if (!(await readText(`changelog.d/${name}`)).trim().startsWith('- ')) failures.push(`changelog.d/${name} must start with a bullet ("- ").`);
}
if (tag && fragments.length) failures.push(`changelog.d still has ${fragments.length} fragment(s); run npm run changelog:compile.`);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Release contract OK: v${packageJson.version}, dist/${hacs.filename}`);
}
