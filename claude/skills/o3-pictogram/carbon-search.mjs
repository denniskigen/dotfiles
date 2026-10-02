#!/usr/bin/env node
// Search the Carbon pictogram registry by name, alias and category.
//
//   node carbon-search.mjs document report summary --category Healthcare --category File
//   node carbon-search.mjs --show white-paper --show contract --out ./out
//   node carbon-search.mjs --list-categories
//
// Uses an installed @carbon/pictograms (searched from each --installed path,
// then the current directory, upward) and otherwise downloads a pinned
// version from jsDelivr into a cache. Always prints the source and version.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, expandHome, loadCarbonRegistry } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), {
  repeatable: ['category', 'installed', 'show'],
  booleans: ['list-categories', 'json', 'refresh'],
});

const registry = await loadCarbonRegistry({
  starts: [...(args.installed || []), process.cwd()],
  version: args.version,
  cache: args.cache,
  refresh: args.refresh,
});
const { icons, categories } = registry;
const categoriesOf = new Map();
for (const c of categories) for (const m of c.members || []) (categoriesOf.get(m) || categoriesOf.set(m, []).get(m)).push(c.name);

console.error(`@carbon/pictograms ${registry.version}, ${registry.source}, ${icons.length} pictograms. License: Apache-2.0.`);

if (args['list-categories']) {
  for (const c of categories) console.log(`${c.name} (${(c.members || []).length})`);
  process.exit(0);
}

if (args.show) {
  const outDir = expandHome(args.out || '.');
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of args.show) {
    const icon = icons.find((i) => i.name === name);
    if (!icon) {
      console.log(`${name}: not found`);
      continue;
    }
    const file = path.join(outDir, `carbon-${name}.svg`);
    fs.writeFileSync(file, icon.assets[0].source);
    console.log(`${name} | ${icon.friendlyName} | aliases: ${(icon.aliases || []).join(', ')} | categories: ${(categoriesOf.get(name) || []).join(', ')}`);
    console.log(`  wrote ${file}`);
  }
  process.exit(0);
}

const keywords = args._.map((k) => k.toLowerCase());
const wanted = new Set((args.category || []).map((c) => c.toLowerCase()));
if (!keywords.length && !wanted.size) {
  console.error('Pass keywords and/or --category. See the top of this file for usage.');
  process.exit(1);
}

const results = [];
for (const icon of icons) {
  const cats = categoriesOf.get(icon.name) || [];
  const haystack = [icon.name, icon.friendlyName, ...(icon.aliases || [])].map((s) => String(s).toLowerCase());
  const hits = keywords.filter((k) => haystack.some((h) => h.includes(k)));
  const inCategory = cats.some((c) => wanted.has(c.toLowerCase()));
  if (hits.length || inCategory) results.push({ name: icon.name, hits, inCategory, aliases: icon.aliases || [], categories: cats });
}
results.sort((a, b) => b.hits.length - a.hits.length || Number(b.inCategory) - Number(a.inCategory) || a.name.localeCompare(b.name));

if (args.json) {
  console.log(JSON.stringify({ version: registry.version, source: registry.source, results }, null, 2));
} else {
  for (const r of results) {
    const why = [r.hits.length ? `matches: ${r.hits.join(', ')}` : '', r.inCategory ? 'category' : ''].filter(Boolean).join('; ');
    console.log(`${r.name.padEnd(36)} ${why.padEnd(34)} aliases: ${r.aliases.slice(0, 8).join(', ')}`);
  }
  console.error(`${results.length} results`);
}
