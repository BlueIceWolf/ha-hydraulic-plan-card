// Fail CI on syntax errors inside the standalone HTML regression harnesses.
// node --check cannot inspect inline <script> blocks on its own.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Script } from 'node:vm';

const directory = new URL('../test/', import.meta.url);
let checked = 0;
for (const file of readdirSync(directory).filter(name => name.endsWith('.html'))) {
  const html = readFileSync(new URL(file, directory), 'utf8');
  const scripts = html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi);
  for (const [, attributes, source] of scripts) {
    if (/\\bsrc\\s*=/.test(attributes) || !source.trim()) continue;
    new Script(source, { filename: join('test', file) });
    checked++;
  }
}
if (!checked) throw new Error('No inline browser harness scripts were checked');
console.log('Checked ' + checked + ' inline browser harness scripts');
