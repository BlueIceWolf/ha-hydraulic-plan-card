import { readFileSync, writeFileSync } from 'node:fs';

const bundlePath = 'dist/ha-hydraulic-plan-card.js';
const bundleVersionPath = 'package.json';
const packageVersion = JSON.parse(readFileSync(bundleVersionPath, 'utf8')).version;
let bundle = readFileSync(bundlePath, 'utf8');

const modules = [
  {
    path: 'src/flexible-plan.js',
    start: 'const HPC_FREE = (function makeFreeHelpers() {',
    end: '// Additional heating components share the original Heat Pump Hydraulic Card SVG.',
  },
  {
    path: 'src/migration.js',
    start: '// Conservative, versioned configuration migration for Hydraulic Plan Card.',
    end: '// Shared hydraulic topology, pipe routing and flow-state evaluation.',
  },
  {
    path: 'src/hydraulic-network.js',
    start: '// Shared hydraulic topology, pipe routing and flow-state evaluation.',
    end: 'const HPC_INTEGRATED = (() => {',
  },
  {
    path: 'src/integrated-extension.js',
    start: 'const HPC_INTEGRATED = (() => {',
    end: '// EMS-ESP exposes its heating appliances via Home Assistant MQTT Discovery.',
  },
  {
    path: 'src/ems-esp-detection.js',
    start: '// EMS-ESP exposes its heating appliances via Home Assistant MQTT Discovery.',
    end: 'const { HydraulicPlanCard, HydraulicPlanCardEditor } = (function hpcUI() {',
  },
  {
    path: 'src/flexible-ui.js',
    start: 'const { HydraulicPlanCard, HydraulicPlanCardEditor } = (function hpcUI() {',
    end: 'const hfcCardScripts = () => {',
  },
];

for (const module of modules) {
  const start = bundle.indexOf(module.start);
  const end = bundle.indexOf(module.end, start + module.start.length);
  const source = readFileSync(module.path, 'utf8');
  const sourceStart = module.path === 'src/integrated-extension.js'
    ? source.indexOf('const HPC_INTEGRATED = (() => {')
    : source.indexOf(module.start);

  if (start < 0 || end < 0 || end <= start || sourceStart < 0) {
    throw new Error(`Cannot locate the ${module.path} section in the bundle or source.`);
  }
  if (bundle.indexOf(module.start, start + module.start.length) >= 0) {
    throw new Error(`Bundle section marker is not unique: ${module.start}`);
  }

  bundle = bundle.slice(0, start) + source.slice(sourceStart).trimEnd() +
    '\n\n' + bundle.slice(end);
}

const versionPattern = /const HFC_VERSION = ['"][^'"]+['"];/;
if (!versionPattern.test(bundle)) {
  throw new Error('Cannot locate HFC_VERSION in the published bundle.');
}
bundle = bundle.replace(versionPattern, `const HFC_VERSION = '${packageVersion}';`);

if (bundle !== readFileSync(bundlePath, 'utf8')) {
  writeFileSync(bundlePath, bundle);
  console.log(`Built ${bundlePath} from the source modules.`);
} else {
  console.log(`${bundlePath} is already up to date.`);
}
