#!/usr/bin/env node
// Static contact sheet and page header preview for pictogram candidates.
//
//   node preview.mjs --out ./out --o3 all \
//     --carbon white-paper,contract \
//     --svg draft=./draft.svg \
//     --jsx form-builder=~/Code/OpenMRS/openmrs-esm-form-builder/src/components/header/illustration.component.tsx \
//     --header draft=./draft.svg --header registration=<svgs>/registration.svg --title "Visit Summary Configuration"
//
// Writes preview.html and preview.png (2x) to --out.
//
// Styleguide pictograms and drafts render the way esm-styleguide renders them
// (checked against svg-utils.ts and pictograms.tsx on 2026-10): each SVG string
// goes into a hidden sprite container with its id, and the pictogram is
// <svg width={size} height={size}><use href="#id"/></svg>. Re-read those files
// if the preview and the real component ever disagree. This is a static
// approximation: the build's SVG optimiser and app CSS are not applied, so the
// final check is always the real component in Storybook or the app shell.
//
// Carbon pictograms are concepts, not O3 artwork: they render in teal with
// their own viewBox. --jsx only handles static inline <svg> markup; components
// that need props, imports or runtime state are skipped with a warning.
import fs from 'node:fs';
import path from 'node:path';
import {
  parseArgs,
  expandHome,
  labelled,
  escapeHtml,
  DEFAULT_REPOS_DIR,
  styleguideSvgDir,
  readSvgSet,
  gitRevision,
  screenshot,
  evaluateTitle,
  svgFromJsx,
  loadCarbonRegistry,
} from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { repeatable: ['svg', 'jsx', 'header'] });
const outDir = expandHome(args.out || './o3-pictogram-preview');
fs.mkdirSync(outDir, { recursive: true });
const size = Number(args.size || 92);
const esmCore = expandHome(args['esm-core'] || path.join(DEFAULT_REPOS_DIR, 'openmrs-esm-core'));
const setDir = expandHome(args.set || styleguideSvgDir(esmCore));
const warnings = [];

const sprites = [];
const spriteId = (label) => `preview-${sprites.length}-${label.replace(/[^\w-]/g, '-')}`;
const addSprite = (label, svg) => {
  const id = spriteId(label);
  sprites.push(svg.replace(/<\?xml[^>]*>/, '').replace(/<svg\b/, `<svg id="${id}"`));
  return id;
};
const pictogram = (id) => `<svg width="${size}" height="${size}"><use href="#${id}"></use></svg>`;
const cell = (inner, label, note = '') =>
  `<figure data-label="${escapeHtml(label)}">${inner}<figcaption>${escapeHtml(label)}${note ? `<small>${escapeHtml(note)}</small>` : ''}</figcaption></figure>`;

const sections = [];

if (args.o3) {
  const set = readSvgSet(setDir);
  const wanted = args.o3 === 'all' ? set : set.filter((s) => args.o3.split(',').includes(s.label));
  const missing = args.o3 === 'all' ? [] : args.o3.split(',').filter((n) => !set.some((s) => s.label === n));
  if (missing.length) warnings.push(`Not in the styleguide set: ${missing.join(', ')}`);
  sections.push({
    title: `O3 styleguide pictograms (${wanted.length}) from ${setDir}, ${gitRevision(setDir)}`,
    cells: wanted.map((s) => cell(pictogram(addSprite(s.label, s.svg)), s.label)),
  });
}

if (args.carbon) {
  const registry = await loadCarbonRegistry({ cache: args.cache });
  const cells = args.carbon.split(',').map((name) => {
    const icon = registry.icons.find((i) => i.name === name);
    if (!icon) {
      warnings.push(`Carbon pictogram not found: ${name}`);
      return cell('<div class="missing">not found</div>', name);
    }
    const svg = icon.assets[0].source
      .replace(/<\?xml[^>]*>/, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<svg\b/, `<svg class="carbon" width="${size}" height="${size}"`);
    return cell(svg, name, (icon.aliases || []).slice(0, 4).join(', '));
  });
  sections.push({ title: `Carbon concepts, @carbon/pictograms ${registry.version} (Apache-2.0), shown in teal: not O3 style`, cells });
}

if (args.svg) {
  sections.push({
    title: 'Drafts and other SVGs, rendered like a styleguide pictogram',
    cells: args.svg.map((spec) => {
      const { label, file } = labelled(spec);
      return cell(pictogram(addSprite(label, fs.readFileSync(file, 'utf8'))), label);
    }),
  });
}

if (args.jsx) {
  sections.push({
    title: 'App-local illustrations (static inline SVG from the component, scaled to the same box for comparison)',
    cells: args.jsx.map((spec) => {
      const { label, file } = labelled(spec);
      const svg = svgFromJsx(fs.readFileSync(file, 'utf8'));
      if (!svg) {
        warnings.push(`${label}: no static <svg> in ${file}; screenshot the running app instead`);
        return cell('<div class="missing">needs the running app</div>', label);
      }
      const defined = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      const missing = [...new Set([...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]))].filter((id) => !defined.has(id));
      if (missing.length) warnings.push(`${label}: references ids it does not define (${missing.join(', ')}), so the static preview is wrong; screenshot the running app instead`);
      return cell(`<div class="jsx">${svg}</div>`, label, path.basename(file));
    }),
  });
}

let headers = '';
if (args.header) {
  const title = args.title || 'Page title';
  const subtitle = args.subtitle ?? 'Clinic';
  headers = args.header
    .map((spec) => {
      const { label, file } = labelled(spec);
      const id = addSprite(label, fs.readFileSync(file, 'utf8'));
      return `<h2>Header preview: ${escapeHtml(label)}</h2><div class="nav"></div><div class="page-header">${pictogram(id)}<div class="labels"><p>${escapeHtml(subtitle)}</p><p class="name">${escapeHtml(title)}</p></div></div><div class="content">Page content starts 16px below the header border.</div>`;
    })
    .join('');
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>Pictogram preview</title>
<style>
  :root { --brand-01: #005d5d; --brand-02: #004144; --brand-03: #007d79; }
  body { font: 13px "IBM Plex Sans", system-ui, sans-serif; color: #161616; margin: 0; padding: 16px; background: #fff; width: 1100px; box-sizing: border-box; }
  h2 { font-size: 14px; margin: 20px 0 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 8px; }
  figure { margin: 0; border: 1px solid #e0e0e0; padding: 8px; text-align: center; }
  figure > svg, figure > .jsx, figure > .missing { display: block; margin: 0 auto 6px; width: ${size}px; height: ${size}px; }
  .jsx svg { width: ${size}px; height: ${size}px; }
  .missing { line-height: ${size}px; color: #a8a8a8; font-size: 11px; }
  figcaption small { display: block; color: #6f6f6f; font-size: 11px; margin-top: 2px; }
  svg.carbon { fill: #007d79; }
  .nav { height: 48px; background: #005d5d; }
  .page-header { display: flex; align-items: center; height: 96px; background: #fff; border-bottom: 1px solid #e0e0e0; }
  .labels p { margin: 0; color: #525252; font-size: 16px; }
  .labels p:first-child { margin-bottom: 4px; }
  .labels .name { font-size: 28px; }
  .content { background: #f4f4f4; padding: 16px; font-size: 14px; }
  .note { color: #6f6f6f; font-size: 12px; margin-top: 16px; }
</style>
<div id="sprites" style="display:none">${sprites.join('\n')}</div>
${sections.map((s) => `<h2>${escapeHtml(s.title)}</h2><div class="grid">${s.cells.join('')}</div>`).join('\n')}
${headers}
<p class="note">Static preview. Confirm with the real Pictogram component in Storybook or the app shell.</p>
<script>
  // Report the page height and any cell that drew nothing, for preview.mjs.
  const blank = [...document.querySelectorAll('figure[data-label]')]
    .filter((f) => { const s = f.querySelector('svg'); if (!s) return false; const b = s.getBBox(); return !b.width || !b.height || !s.querySelector('path, rect, circle, ellipse, polygon, use'); })
    .map((f) => f.dataset.label);
  document.title = JSON.stringify({ height: document.documentElement.scrollHeight, blank });
</script>`;

const htmlFile = path.join(outDir, 'preview.html');
fs.writeFileSync(htmlFile, html);
const measured = JSON.parse(evaluateTitle(htmlFile, { chrome: args.chrome }));
for (const label of measured.blank) warnings.push(`${label}: rendered blank in the static preview (theme variables, masks or runtime context); screenshot the running app instead`);
screenshot(htmlFile, path.join(outDir, 'preview.png'), { chrome: args.chrome, width: 1100, height: measured.height + 16 });
console.log(`Wrote ${htmlFile}\nWrote ${path.join(outDir, 'preview.png')}`);
if (warnings.length) console.log(`Warnings:\n  ${warnings.join('\n  ')}`);
