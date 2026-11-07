// Verifies the built-in languages of the card (HFC_LANGUAGES, HFC_I18N, HFC_EDITOR in dist/heatpump-hydraulic-card.js).
//   node scripts/i18n-check.mjs              check all languages and print the coverage
//   node scripts/i18n-check.mjs --missing pl list the texts that are still missing for one language
// Errors (unknown keys, wrong kind of value, changed placeholders, missing language name) fail with exit code 1.
// Missing texts are not errors: a language may be translated in part and falls back to English.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// HFC_CARD_FILE points the check at another copy of the card (used to test the check itself).
const file = process.env.HFC_CARD_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'heatpump-hydraulic-card.js');
const source = fs.readFileSync(file, 'utf8');

// Cuts the object literal after `const <name> = ` out of the source. Quotes and comments are skipped, so braces in
// texts (the placeholders) do not disturb the nesting.
function literal(name) {
  const start = source.indexOf(`const ${name} = {`);
  if (start < 0) throw new Error(`const ${name} not found in ${path.basename(file)}`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    const c = source[i];
    if (c === "'" || c === '"' || c === '`') {
      for (i++; source[i] !== c; i++) if (source[i] === '\\') i++;
    } else if (c === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
    } else if (c === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i) + 1;
    } else if (c === '{') {
      depth++;
    } else if (c === '}' && --depth === 0) {
      return new Function(`return (${source.slice(source.indexOf('{', start), i + 1)});`)();
    }
  }
  throw new Error(`const ${name} is not closed`);
}

const languages = literal('HFC_LANGUAGES');
const tables = { 'card texts (HFC_I18N)': literal('HFC_I18N'), 'editor labels (HFC_EDITOR)': literal('HFC_EDITOR') };

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const leaves = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) => (isObject(v) ? leaves(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));
const placeholders = (text) => [...String(text).matchAll(/\{[a-z_]+\}/g)].map((m) => m[0]).sort().join(' ');

const errors = [];
const fail = (message) => errors.push(message);

const codes = new Set([...Object.keys(languages), ...Object.values(tables).flatMap((t) => Object.keys(t))]);
for (const code of codes) {
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code)) fail(`${code}: the language code must be lowercase, for example pl or pt-br`);
  if (!(code in languages)) fail(`${code}: add "${code}: '<name of the language in that language>'" to HFC_LANGUAGES`);
  else if (typeof languages[code] !== 'string' || !languages[code].trim()) fail(`${code}: the name in HFC_LANGUAGES must be text`);
  if (!Object.values(tables).some((t) => code in t)) fail(`${code}: listed in HFC_LANGUAGES but has no block in HFC_I18N or HFC_EDITOR`);
}

const missing = {};
const rows = [];
for (const [label, table] of Object.entries(tables)) {
  if (!table.en) { fail(`${label}: the English block is missing`); continue; }
  const reference = new Map(leaves(table.en));
  for (const code of Object.keys(languages)) {
    const block = table[code];
    const have = new Set();
    if (block !== undefined && !isObject(block)) { fail(`${label} ${code}: must be an object`); continue; }
    // A group where English has text (or text where English has a group), including an empty group, would show
    // "[object Object]" at runtime; flattening alone would drop it without a word.
    const shape = (value, ref, where) => Object.entries(value).forEach(([key, child]) => {
      if (!(key in ref)) { if (isObject(child) && !Object.keys(child).length) fail(`${label} ${code}: unknown key "${where}${key}" (it is not in the English block)`); return; }
      if (isObject(ref[key]) !== isObject(child)) fail(`${label} ${code}: "${where}${key}" must be ${isObject(ref[key]) ? 'a group of texts' : 'text'}, as in English`);
      else if (isObject(child)) shape(child, ref[key], `${where}${key}.`);
    });
    if (block !== undefined) shape(block, table.en, '');
    for (const [key, value] of leaves(block || {})) {
      if (!reference.has(key)) { fail(`${label} ${code}: unknown key "${key}" (it is not in the English block)`); continue; }
      if (typeof value !== 'string' || !value.trim()) { fail(`${label} ${code}: "${key}" must be non-empty text (leave it out to fall back to English)`); continue; }
      if (placeholders(value) !== placeholders(reference.get(key))) {
        fail(`${label} ${code}: "${key}" must keep the placeholders of the English text (${placeholders(reference.get(key)) || 'none'})`);
      }
      have.add(key);
    }
    for (const key of reference.keys()) if (!have.has(key) && code !== 'en') (missing[`${code}|${label}`] ||= []).push(key);
    rows.push({ code, label, have: have.size, total: reference.size, present: block !== undefined });
  }
}

const wanted = process.argv.indexOf('--missing') > 0 ? process.argv[process.argv.indexOf('--missing') + 1] : null;
if (wanted) {
  if (!(wanted in languages)) { console.error(`Unknown language "${wanted}". Built in: ${Object.keys(languages).join(', ')}`); process.exit(1); }
  for (const label of Object.keys(tables)) {
    const keys = missing[`${wanted}|${label}`] || [];
    console.log(`${label}: ${keys.length} missing for ${wanted}`);
    keys.forEach((k) => console.log(`  ${k}`));
  }
} else {
  for (const label of Object.keys(tables)) {
    console.log(label);
    rows.filter((r) => r.label === label).forEach((r) => console.log(`  ${r.code.padEnd(6)} ${String(r.have).padStart(3)} / ${r.total}${r.present ? '' : '  (no block yet)'}  ${languages[r.code]}`));
  }
}

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'}:`);
  errors.forEach((e) => console.error(`  ${e}`));
  process.exit(1);
}
if (!wanted) console.log('\ni18n OK');
