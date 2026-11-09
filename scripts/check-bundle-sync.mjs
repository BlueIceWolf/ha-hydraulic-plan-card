import { readFileSync } from 'node:fs';

const bundle = readFileSync('dist/ha-hydraulic-plan-card.js', 'utf8');
const packageVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const modulePaths = [
  'src/flexible-plan.js',
  'src/hydraulic-network.js',
  'src/migration.js',
  'src/integrated-extension.js',
  'src/ems-esp-detection.js',
  'src/flexible-ui.js',
];

const errors = [];
if (!bundle.includes(`const HFC_VERSION = '${packageVersion}';`)) {
  errors.push('The published bundle version does not match package.json.');
}

for (const path of modulePaths) {
  const source = readFileSync(path, 'utf8');
  // The integrated module's introductory comment is retained ahead of the
  // migration module in the historical bundle ordering.
  const content = path.endsWith('/integrated-extension.js')
    ? source.slice(source.indexOf('const HPC_INTEGRATED'))
    : source;
  if (!content || !bundle.includes(content.trimEnd())) {
    errors.push(`dist bundle differs from ${path}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log('Bundle synchronization verified for all six extension modules.');
}
