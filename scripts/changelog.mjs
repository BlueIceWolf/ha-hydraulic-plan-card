// Adds the fragments of changelog.d/ to the top of the "## Unreleased" section of CHANGELOG.md and deletes them.
// `node scripts/changelog.mjs --check` only validates the fragments (used by `npm run release:check`).
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dir = resolve(root, 'changelog.d');
const check = process.argv.includes('--check');

const names = (await readdir(dir)).filter((n) => n.endsWith('.md') && n !== 'README.md').sort();
const fragments = [];
const failures = [];
for (const name of names) {
  const text = (await readFile(resolve(dir, name), 'utf8')).trim();
  if (!text) failures.push(`changelog.d/${name} is empty.`);
  else if (!text.startsWith('- ')) failures.push(`changelog.d/${name} must start with a bullet ("- ").`);
  else fragments.push(text);
}
if (failures.length) {
  console.error(failures.map((f) => `- ${f}`).join('\n'));
  process.exit(1);
}
if (check || !fragments.length) {
  console.log(`${fragments.length} changelog fragment(s) ${check ? 'valid' : 'found, nothing to compile'}.`);
  process.exit(0);
}

const file = resolve(root, 'CHANGELOG.md');
const changelog = await readFile(file, 'utf8');
const heading = '## Unreleased\n';
const at = changelog.indexOf(heading);
if (at < 0) {
  console.error('CHANGELOG.md has no "## Unreleased" section to add the fragments to.');
  process.exit(1);
}
const cut = at + heading.length;
await writeFile(file, `${changelog.slice(0, cut)}${fragments.join('\n')}\n${changelog.slice(cut)}`);
await Promise.all(names.map((n) => rm(resolve(dir, n))));
console.log(`Added ${fragments.length} fragment(s) to CHANGELOG.md.`);
