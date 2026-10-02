#!/usr/bin/env node
// Measure the drawn area of every styleguide pictogram, and where drafts fall
// against that range.
//
//   node svg-bounds.mjs --esm-core ~/Code/OpenMRS/openmrs-esm-core draft.svg
//
// Bounds come from getBBox() on the root <svg>, which covers the filled
// geometry of its children. It ignores stroke width, and any invisible
// geometry still counts, so the script warns about strokes, transforms and
// fill="none"/opacity on paths. The set has none of these as of 2026-10.
//
// The numbers are a starting range, not an acceptance test. Each edge is
// summarised on its own, so the medians do not describe one ideal rectangle.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs, expandHome, DEFAULT_REPOS_DIR, styleguideSvgDir, readSvgSet, gitRevision, labelled, evaluateTitle } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { booleans: ['json'] });
const esmCore = expandHome(args['esm-core'] || path.join(DEFAULT_REPOS_DIR, 'openmrs-esm-core'));
const setDir = expandHome(args.set || styleguideSvgDir(esmCore));
const set = readSvgSet(setDir).map((s) => ({ ...s, kind: 'set' }));
const drafts = args._.map((spec) => {
  const { label, file } = labelled(spec);
  return { label, file, svg: fs.readFileSync(file, 'utf8'), kind: 'draft' };
});
const all = [...set, ...drafts];

const warnings = [];
for (const s of all) {
  if (/\bstroke(-width)?=/.test(s.svg)) warnings.push(`${s.label}: uses stroke (bounds exclude stroke width)`);
  if (/\btransform=/.test(s.svg)) warnings.push(`${s.label}: uses transform (check the bounds by eye)`);
  if (/fill="none"|opacity="0"/.test(s.svg)) warnings.push(`${s.label}: has invisible geometry that still counts toward bounds`);
  if (/viewBox=/.test(s.svg)) warnings.push(`${s.label}: has a viewBox; check this matches how Pictogram renders today`);
  if (s.kind === 'draft') s.fills = [...new Set([...s.svg.matchAll(/fill="(#[0-9A-Fa-f]{3,8})"/g)].map((m) => m[1].toUpperCase()))];
}

const html = `<!doctype html><title></title><body>${all
  .map((s, i) => `<div data-i="${i}">${s.svg.replace(/<\?xml[^>]*>/, '').replace('<svg ', '<svg width="92" height="92" ')}</div>`)
  .join('')}<script>document.title = JSON.stringify([...document.querySelectorAll('div[data-i]')].map(d => { const b = d.querySelector('svg').getBBox(); return [b.x, b.y, b.x + b.width, b.y + b.height].map(n => Math.round(n * 10) / 10); }));</script></body>`;
const tmp = path.join(os.tmpdir(), `o3-pictogram-bounds-${process.pid}.html`);
fs.writeFileSync(tmp, html);
const boxes = JSON.parse(evaluateTitle(tmp, { chrome: args.chrome }));
fs.rmSync(tmp);
all.forEach((s, i) => ([s.x0, s.y0, s.x1, s.y1] = boxes[i]));

const edges = ['x0', 'y0', 'x1', 'y1'];
const round = (n) => Math.round(n * 10) / 10;
const quantile = (vals, q) => {
  const v = [...vals].sort((a, b) => a - b);
  const pos = (v.length - 1) * q;
  const lo = Math.floor(pos);
  return round(v[lo] + (v[Math.ceil(pos)] - v[lo]) * (pos - lo));
};
const stats = Object.fromEntries(
  edges.map((e) => {
    const vals = set.map((s) => s[e]);
    return [e, { min: Math.min(...vals), p25: quantile(vals, 0.25), median: quantile(vals, 0.5), p75: quantile(vals, 0.75), max: Math.max(...vals) }];
  }),
);
const isOut = (s, e) => {
  const iqr = stats[e].p75 - stats[e].p25;
  return s[e] < stats[e].p25 - 1.5 * iqr || s[e] > stats[e].p75 + 1.5 * iqr;
};
const outliers = set.filter((s) => edges.some((e) => isOut(s, e)));

if (args.json) {
  console.log(JSON.stringify({ setDir, revision: gitRevision(setDir), stats, items: all.map(({ svg, ...rest }) => rest), outliers: outliers.map((o) => o.label), warnings }, null, 2));
  process.exit(0);
}

console.log(`Set: ${setDir}\nRevision: ${gitRevision(setDir)}\n${set.length} pictograms, measured at 1:1 (no viewBox), in user units.\n`);
console.log('label'.padEnd(26) + ['x0', 'y0', 'x1', 'y1', 'w', 'h'].map((h) => h.padStart(7)).join(''));
for (const s of all) {
  const row = [s.x0, s.y0, s.x1, s.y1, round(s.x1 - s.x0), round(s.y1 - s.y0)];
  console.log((s.kind === 'draft' ? `* ${s.label}` : s.label).padEnd(26) + row.map((n) => String(n).padStart(7)).join(''));
}
console.log('\nedge   min    p25    median p75    max');
for (const e of edges) console.log(e.padEnd(7) + Object.values(stats[e]).map((n) => String(n).padEnd(7)).join(''));
if (outliers.length) console.log(`\nOutliers to inspect (outside 1.5 IQR on some edge): ${outliers.map((o) => o.label).join(', ')}`);
for (const d of drafts) {
  const out = edges.filter((e) => d[e] < stats[e].min || d[e] > stats[e].max);
  console.log(`\n* ${d.label}: ${out.length ? `outside the set's range on ${out.join(', ')}` : "within the set's range on every edge"}. Fills: ${d.fills.join(', ') || 'none'}.`);
}
if (warnings.length) console.log(`\nWarnings:\n  ${warnings.join('\n  ')}`);
