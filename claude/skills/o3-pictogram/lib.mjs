// Shared helpers for the o3-pictogram scripts. Node 18+, no dependencies.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const DEFAULT_REPOS_DIR = process.env.O3_REPOS_DIR || path.join(os.homedir(), 'Code', 'OpenMRS');
export const DEFAULT_CHROME =
  process.env.CHROME_PATH ||
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find((p) => fs.existsSync(p));

/** Minimal argv parser: --flag value, --flag (boolean), repeatable flags collect into arrays. */
export function parseArgs(argv, { repeatable = [], booleans = [] } = {}) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const key = a.slice(2);
    if (booleans.includes(key)) {
      out[key] = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined) throw new Error(`Missing value for --${key}`);
    if (repeatable.includes(key)) (out[key] ||= []).push(value);
    else out[key] = value;
  }
  return out;
}

export function expandHome(p) {
  return p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

/** Splits "label=path" into { label, file }. A bare path uses its basename as the label. */
export function labelled(spec) {
  const i = spec.indexOf('=');
  if (i === -1) return { label: path.basename(spec).replace(/\.\w+$/, ''), file: expandHome(spec) };
  return { label: spec.slice(0, i), file: expandHome(spec.slice(i + 1)) };
}

export function styleguideSvgDir(esmCore) {
  return path.join(esmCore, 'packages/framework/esm-styleguide/src/pictograms/svgs');
}

export function readSvgSet(dir) {
  if (!fs.existsSync(dir)) throw new Error(`Pictogram SVG directory not found: ${dir}`);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .sort()
    .map((f) => ({ label: f.replace(/\.svg$/, ''), file: path.join(dir, f), svg: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

export function gitRevision(dir) {
  try {
    const opts = { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] };
    const rev = execFileSync('git', ['log', '-1', '--format=%h %cs %s'], opts).toString().trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], opts).toString().trim() ? ' (uncommitted changes)' : '';
    return rev + dirty;
  } catch {
    return 'not a git checkout';
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/** Renders an HTML file to PNG with headless Chrome. */
export function screenshot(htmlFile, pngFile, { chrome = DEFAULT_CHROME, width = 1000, height = 800, scale = 2 } = {}) {
  if (!chrome) throw new Error('No Chrome/Chromium found. Pass --chrome <path> or set CHROME_PATH.');
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--force-device-scale-factor=${scale}`,
      `--window-size=${width},${height}`,
      `--screenshot=${pngFile}`,
      `file://${path.resolve(htmlFile)}`,
    ],
    { stdio: 'ignore' },
  );
}

/** Loads an HTML file in headless Chrome and returns document.title after scripts run. */
export function evaluateTitle(htmlFile, { chrome = DEFAULT_CHROME } = {}) {
  if (!chrome) throw new Error('No Chrome/Chromium found. Pass --chrome <path> or set CHROME_PATH.');
  const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--dump-dom', `file://${path.resolve(htmlFile)}`], {
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
  const m = dom.match(/<title>([\s\S]*?)<\/title>/);
  if (!m) throw new Error('Rendering produced no result');
  return m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export const CARBON_PINNED_VERSION = '12.85.0';

/**
 * Loads @carbon/pictograms metadata. Prefers an installed copy (searched from
 * each start directory upward), otherwise downloads the pinned version from
 * jsDelivr into a cache. Returns { icons, categories, version, source }.
 */
export async function loadCarbonRegistry({ starts = [process.cwd()], version = CARBON_PINNED_VERSION, cache, refresh = false } = {}) {
  for (const start of starts) {
    let dir = path.resolve(expandHome(start));
    for (;;) {
      const meta = path.join(dir, 'node_modules/@carbon/pictograms/metadata.json');
      if (fs.existsSync(meta)) {
        const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(meta), 'package.json'), 'utf8'));
        return { ...JSON.parse(fs.readFileSync(meta, 'utf8')), version: pkg.version, source: `installed at ${path.dirname(meta)}` };
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  const cacheDir = expandHome(cache || path.join(os.tmpdir(), 'o3-pictogram-cache'));
  fs.mkdirSync(cacheDir, { recursive: true });
  const meta = path.join(cacheDir, `carbon-pictograms-${version}-metadata.json`);
  if (!fs.existsSync(meta) || refresh) {
    const url = `https://cdn.jsdelivr.net/npm/@carbon/pictograms@${version}/metadata.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
    fs.writeFileSync(meta, await res.text());
  }
  return { ...JSON.parse(fs.readFileSync(meta, 'utf8')), version, source: `downloaded from jsDelivr (cached at ${meta})` };
}

/**
 * Pulls a static <svg> out of a JSX/TSX component and converts React attribute
 * names. Returns null when the markup uses runtime expressions (props, state,
 * imports), because a static preview of those would be wrong.
 */
export function svgFromJsx(source) {
  const m = source.match(/<svg[\s\S]*?<\/svg>/);
  if (!m) return null;
  let svg = m[0]
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(\w+)=\{\s*(['"])(.*?)\2\s*\}/g, '$1="$3"')
    .replace(/(\w+)=\{\s*(-?[\d.]+)\s*\}/g, '$1="$2"');
  if (/\{[^}]*\}/.test(svg)) return null;
  const attrs = {
    className: 'class',
    fillRule: 'fill-rule',
    clipRule: 'clip-rule',
    fillOpacity: 'fill-opacity',
    strokeWidth: 'stroke-width',
    strokeLinejoin: 'stroke-linejoin',
    strokeLinecap: 'stroke-linecap',
    strokeMiterlimit: 'stroke-miterlimit',
    xmlSpace: 'xml:space',
    xlinkHref: 'xlink:href',
  };
  for (const [react, html] of Object.entries(attrs)) svg = svg.replace(new RegExp(`\\b${react}=`, 'g'), `${html}=`);
  return svg;
}
