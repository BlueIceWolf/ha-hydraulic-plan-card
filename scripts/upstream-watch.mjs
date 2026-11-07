// Watches the upstream integrations that the presets are built on.
//
// Every upstream/<preset>.json names the repositories and files a preset depends on (entity ids, translation keys, state
// texts) and when they were last reviewed. For each preset this script lists the commits to those files and the newest
// release since then and keeps ONE open issue per preset with that list (label "upstream-change").
//
//   node scripts/upstream-watch.mjs                 create or update the issues (needs GITHUB_TOKEN and GITHUB_REPOSITORY)
//   node scripts/upstream-watch.mjs --dry-run       print what would be reported, change nothing
//   node scripts/upstream-watch.mjs --check         validate the manifests offline (used by release:check)
//   node scripts/upstream-watch.mjs --ack <preset>  mark a preset as reviewed today, with the newest release as its version
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dir = resolve(root, 'upstream');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const API = 'https://api.github.com';
const LABEL = 'upstream-change';
const MAX_COMMITS = 40;
// Dependency bumps and translation syncs do not change entity ids or states.
const NOISE = /^(bump |update dependency|chore\(deps|\[pre-commit\.ci\]|translations update|merge (pull request|branch))/i;

const loadManifests = async () => {
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  return Promise.all(names.map(async (name) => ({ name, ...JSON.parse(await readFile(resolve(dir, name), 'utf8')) })));
};

const validate = (m) => {
  const problems = [];
  const at = `upstream/${m.name}`;
  if (m.name !== `${m.preset}.json`) problems.push(`${at}: "preset" must match the file name.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.reviewed?.date || '')) problems.push(`${at}: reviewed.date must be YYYY-MM-DD.`);
  if (!Array.isArray(m.sources) || !m.sources.length) problems.push(`${at}: sources must list at least one repository.`);
  (m.sources || []).forEach((s, n) => {
    if (!/^[\w.-]+\/[\w.-]+$/.test(s.repo || '')) problems.push(`${at}: sources[${n}].repo must be owner/name.`);
    if (!s.branch) problems.push(`${at}: sources[${n}].branch is missing.`);
    if (!Array.isArray(s.paths) || !s.paths.length) problems.push(`${at}: sources[${n}].paths must list files.`);
  });
  return problems;
};

const token = process.env.GITHUB_TOKEN;
const gh = async (path, init = {}) => {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    ...init,
    headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
};

// Newest release tag of a repository, or null when it publishes none.
const latestRelease = async (repo) => {
  const r = await gh(`/repos/${repo}/releases/latest`);
  return r ? { tag: r.tag_name, date: r.published_at, url: r.html_url } : null;
};

// Commits on the branch that touch one of the files since the review date, newest first, without noise.
const changesSince = async (source, since) => {
  const found = new Map();
  const missing = [];
  for (const path of source.paths) {
    const list = await gh(`/repos/${source.repo}/commits?sha=${encodeURIComponent(source.branch)}&path=${encodeURIComponent(path)}&since=${since}T00:00:00Z&per_page=30`);
    if (list === null || (!list.length && !(await gh(`/repos/${source.repo}/contents/${path}?ref=${encodeURIComponent(source.branch)}`)))) { missing.push(path); continue; }
    for (const c of list) {
      const subject = c.commit.message.split('\n')[0];
      if (NOISE.test(subject)) continue;
      const known = found.get(c.sha) || { sha: c.sha, date: c.commit.author.date, subject, url: c.html_url, files: [] };
      known.files.push(path.split('/').pop());
      found.set(c.sha, known);
    }
  }
  return { commits: [...found.values()].sort((a, b) => b.date.localeCompare(a.date)), missing };
};

const inspect = async (m) => {
  const sources = [];
  for (const source of m.sources) {
    const [release, changes] = await Promise.all([
      source.releases === false ? null : latestRelease(source.repo),
      changesSince(source, m.reviewed.date),
    ]);
    // A release counts when it is not the reviewed one and was published after the review.
    const newRelease = release && release.tag !== m.reviewed.version && release.date.slice(0, 10) > m.reviewed.date ? release : null;
    sources.push({ source, release, newRelease, ...changes });
  }
  const changed = sources.some((s) => s.newRelease || s.commits.length);
  return { m, sources, changed, missing: sources.flatMap((s) => s.missing.map((p) => `${s.source.repo}: ${p}`)) };
};

const render = ({ m, sources, missing }) => {
  const head = sources.flatMap((s) => [s.commits[0]?.sha || '', s.newRelease?.tag || '']).join(',');
  const lines = [
    `<!-- upstream-head: ${head} -->`,
    `The integrations behind the \`${m.preset}\` preset changed since the last review (${m.reviewed.date}${m.reviewed.version ? `, version ${m.reviewed.version}` : ''}).`,
    'Entity ids, translation keys and state texts of the preset may be affected. The list is generated; it shows commits to the files the preset depends on.',
    '',
  ];
  for (const s of sources) {
    lines.push(`### [${s.source.repo}](https://github.com/${s.source.repo}) (${s.source.branch})`);
    if (s.newRelease) lines.push(`- New release: [${s.newRelease.tag}](${s.newRelease.url}) (${s.newRelease.date.slice(0, 10)})`);
    else if (s.release) lines.push(`- Latest release: ${s.release.tag}, already reviewed`);
    if (s.commits.length) {
      lines.push(`- ${s.commits.length} commit(s) to watched files:`);
      s.commits.slice(0, MAX_COMMITS).forEach((c) => lines.push(`  - ${c.date.slice(0, 10)} [\`${c.sha.slice(0, 7)}\`](${c.url}) ${c.subject.replace(/[<>]/g, '')} (${[...new Set(c.files)].join(', ')})`));
      if (s.commits.length > MAX_COMMITS) lines.push(`  - … and ${s.commits.length - MAX_COMMITS} more`);
    }
    lines.push('');
  }
  if (missing.length) lines.push('Watched files that no longer exist (renamed or removed upstream, update `upstream/' + m.preset + '.json`):', ...missing.map((p) => `- ${p}`), '');
  lines.push(
    '### Review',
    '- [ ] Entity ids and translation keys used by the preset still exist',
    '- [ ] State texts and units are unchanged (mode maps, `error_ok`, `program_map`)',
    '- [ ] New entities worth mapping noted or implemented',
    `- [ ] \`npm run upstream:ack -- ${m.preset}\` committed (sets the review date and version), then close this issue`,
  );
  return lines.join('\n');
};

const report = async (result) => {
  const repo = process.env.GITHUB_REPOSITORY;
  const title = `Upstream changes: ${result.m.preset}`;
  const body = render(result);
  if (flag('--dry-run') || !token || !repo) {
    console.log(`\n=== ${title}${result.changed ? '' : ' (no changes)'}\n${result.changed || result.missing.length ? body : ''}`);
    return;
  }
  if (!result.changed && !result.missing.length) return;
  await gh(`/repos/${repo}/labels`, { method: 'POST', body: JSON.stringify({ name: LABEL, color: 'c5def5', description: 'Generated: an upstream integration of a preset changed' }), headers: { 'content-type': 'application/json' } }).catch(() => null);
  const open = (await gh(`/repos/${repo}/issues?labels=${LABEL}&state=open&per_page=100`)) || [];
  const existing = open.find((i) => i.title === title && !i.pull_request);
  const json = { 'content-type': 'application/json' };
  if (!existing) {
    const created = await gh(`/repos/${repo}/issues`, { method: 'POST', headers: json, body: JSON.stringify({ title, body, labels: [LABEL] }) });
    console.log(`Opened #${created.number}: ${title}`);
  } else if (!existing.body?.includes(body.split('\n')[0])) {
    await gh(`/repos/${repo}/issues/${existing.number}`, { method: 'PATCH', headers: json, body: JSON.stringify({ body }) });
    await gh(`/repos/${repo}/issues/${existing.number}/comments`, { method: 'POST', headers: json, body: JSON.stringify({ body: 'The list was updated: there are further upstream changes.' }) });
    console.log(`Updated #${existing.number}: ${title}`);
  } else {
    console.log(`Unchanged #${existing.number}: ${title}`);
  }
};

const ack = async (preset) => {
  const file = resolve(dir, `${preset}.json`);
  const m = JSON.parse(await readFile(file, 'utf8'));
  let version = null;
  for (const source of m.sources) {
    if (source.releases === false) continue;
    version = (await latestRelease(source.repo))?.tag ?? version;
    if (version) break;
  }
  m.reviewed = { date: new Date().toISOString().slice(0, 10), version, ...(m.reviewed.note && flag('--keep-note') ? { note: m.reviewed.note } : {}) };
  await writeFile(file, `${JSON.stringify(m, null, 2)}\n`);
  console.log(`upstream/${preset}.json: reviewed ${m.reviewed.date}${version ? `, version ${version}` : ''}.`);
};

if (flag('--check')) {
  const problems = (await loadManifests()).flatMap(validate);
  if (problems.length) { console.error(problems.map((p) => `- ${p}`).join('\n')); process.exit(1); }
  console.log('Upstream manifests valid.');
} else if (flag('--ack')) {
  const preset = args[args.indexOf('--ack') + 1];
  if (!preset || preset.startsWith('--')) { console.error('Usage: --ack <preset>'); process.exit(1); }
  await ack(preset);
} else {
  const problems = [];
  for (const m of await loadManifests()) {
    const bad = validate(m);
    if (bad.length) { problems.push(...bad); continue; }
    try { await report(await inspect(m)); } catch (error) { problems.push(`${m.name}: ${error.message}`); }
  }
  if (problems.length) { console.error(problems.map((p) => `- ${p}`).join('\n')); process.exitCode = 1; }
}
