#!/usr/bin/env node
// High-DPI, optimized UI screenshots with Playwright.
//
//   const { captureShots } = require('<skill>/scripts/screenshot');
//   captureShots({ baseUrl, login, startPath, setup, shots, outDir });
//
// Or one shot from the command line:
//   node screenshot.js <url> <out.png> [--crop <selector>] [--padding 16] [--dsf 3] [--full-page]
//                      [--wait <selector>] [--viewport 1280x800] [--lossless] [--no-optimize] [--no-login]
//
// See ../SKILL.md for the workflow and ./example-shots.js for a complete script.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

function loadPlaywright() {
  const searchPaths = [
    process.env.PLAYWRIGHT_DIR,
    process.cwd(),
    // Repos live under ~/Code/OpenMRS on some machines and directly under ~/Code on others
    path.join(os.homedir(), 'Code/OpenMRS/openmrs-esm-patient-chart'),
    path.join(os.homedir(), 'Code/OpenMRS/openmrs-esm-core'),
    path.join(os.homedir(), 'Code/openmrs-esm-patient-chart'),
    path.join(os.homedir(), 'Code/openmrs-esm-core'),
  ].filter(Boolean);
  // Each repo pins its own Playwright version, and only some have their browser downloaded
  for (const dir of searchPaths) {
    for (const name of ['playwright', '@playwright/test']) {
      try {
        const pw = require(require.resolve(name, { paths: [dir] }));
        if (fs.existsSync(pw.chromium.executablePath())) return pw;
      } catch {}
    }
  }
  throw new Error(`No Playwright with an installed Chromium. Set PLAYWRIGHT_DIR or run \`npx playwright install chromium\` in one of: ${searchPaths.join(', ')}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hides the dev-server error overlay and anything that makes a still look mid-transition.
const CAPTURE_CSS = `
  #webpack-dev-server-client-overlay { display: none !important; }
  *, *::before, *::after { caret-color: transparent !important; }
`;

/** Log in to an OpenMRS backend through REST (shares cookies with the page) and set the session location. */
async function openmrsLogin(page, { baseUrl, username = 'admin', password = 'Admin123', location = 'Outpatient Clinic' }) {
  const rest = `${baseUrl}/openmrs/ws/rest/v1`;
  const auth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const session = await (await page.request.get(`${rest}/session`, { headers: { Authorization: auth } })).json();
  if (!session.authenticated) throw new Error(`Login failed for ${username} at ${rest}`);
  if (location) {
    const res = await (await page.request.get(`${rest}/location?q=${encodeURIComponent(location)}&v=custom:(uuid,display)`)).json();
    if (!res.results?.length) throw new Error(`No location matching "${location}"`);
    await page.request.post(`${rest}/session`, { data: { sessionLocation: res.results[0].uuid } });
  }
}

/** Resolve a crop spec (selector, locator, rect, or async fn) to a CSS-pixel rect, with padding, clamped to the page. */
async function resolveCrop(page, crop, padding = 0) {
  if (!crop) return null;
  let rect;
  if (typeof crop === 'function') rect = await crop(page);
  else if (typeof crop === 'string') rect = await page.locator(crop).first().boundingBox();
  else if (typeof crop.boundingBox === 'function') rect = await crop.boundingBox();
  else rect = crop;
  if (!rect) throw new Error('Crop target not found');
  const bounds = page.viewportSize();
  const x = Math.max(0, Math.floor(rect.x - padding));
  const y = Math.max(0, Math.floor(rect.y - padding));
  return {
    x,
    y,
    width: Math.min(bounds.width - x, Math.ceil(rect.x + rect.width + padding) - x),
    height: Math.min(bounds.height - y, Math.ceil(rect.y + rect.height + padding) - y),
  };
}

/** Wait until the page looks finished: network quiet, fonts and images loaded, no Carbon skeletons or loaders. */
async function settle(page, { timeout = 15000 } = {}) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page
    .waitForFunction(
      () =>
        document.fonts.status === 'loaded' &&
        [...document.images].every((img) => img.complete) &&
        !document.querySelector('.cds--skeleton, .cds--skeleton__text, .cds--loading:not(.cds--loading--stop), .cds--inline-loading__animation'),
      null,
      { timeout },
    )
    .catch(() => console.warn('settle: page still shows loaders or pending fonts/images; capturing anyway'));
  // Two frames so layout from the last state change has painted
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await sleep(150);
}

/**
 * Optimize a PNG in place. 'lossy' quantizes with pngquant only when it can hold `quality`,
 * otherwise it stays lossless; both modes finish with a lossless optipng pass.
 */
function optimizePng(file, { mode = 'lossy', quality = 90 } = {}) {
  const before = fs.statSync(file).size;
  let quantized = false;
  if (mode === 'lossy') {
    const tmp = file + '.q.png';
    const r = spawnSync('pngquant', [`--quality=${quality}-100`, '--speed=1', '--strip', '--skip-if-larger', '--force', '--output', tmp, file]);
    if (r.error) console.warn('pngquant not found; staying lossless (brew install pngquant)');
    else if (r.status === 0 && fs.existsSync(tmp)) {
      fs.renameSync(tmp, file);
      quantized = true;
    } else fs.rmSync(tmp, { force: true });
    // Exit 99 means the palette couldn't reach the quality floor, 98 means it wasn't smaller
  }
  const r = spawnSync('optipng', ['-o2', '-strip', 'all', '-quiet', file]);
  if (r.error) console.warn('optipng not found; skipping lossless pass (brew install optipng)');
  return { before, after: fs.statSync(file).size, quantized };
}

/**
 * Captures one or more screenshots from a single page session.
 *
 * opts.baseUrl     origin of the app, e.g. http://localhost:8130
 * opts.login       false, or { username, password, location } for OpenMRS REST login
 * opts.startPath   path to open before setup (relative to baseUrl)
 * opts.setup       async (page) => {}  bring the UI to the first state
 * opts.shots       [{ name, before?, crop?, padding?, fullPage?, wait?, keepMouse? }]
 *                    before   async (page) => {}  run before this shot (open a modal, hover a row)
 *                    crop     selector | locator | {x,y,width,height} | async (page) => rect   (CSS px)
 *                    padding  CSS px around the crop (default 16 when cropping)
 *                    fullPage capture the whole scrollable document instead of the viewport
 *                    wait     selector to wait for before capturing
 *                    keepMouse leave the mouse where `before` put it, for hover states and tooltips
 * opts.outDir      directory for <name>.png files
 * opts.dsf         device scale factor (default 3; 4 for very small crops)
 * opts.viewport    CSS viewport (default 1280x800)
 * opts.optimize    'lossy' (default), 'lossless', or false
 * opts.quality     pngquant quality floor for 'lossy' (default 90)
 */
async function captureShots(opts) {
  const {
    baseUrl,
    login = false,
    startPath = '/',
    setup = async () => {},
    shots,
    outDir,
    dsf = 3,
    viewport = { width: 1280, height: 800 },
    optimize = 'lossy',
    quality = 90,
  } = opts;
  if (!outDir) throw new Error('opts.outDir is required');
  if (!shots?.length) throw new Error('opts.shots is required');
  const { chromium } = loadPlaywright();
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const results = [];
  try {
    const context = await browser.newContext({ viewport, deviceScaleFactor: dsf, reducedMotion: 'reduce' });
    const page = await context.newPage();
    if (login) await openmrsLogin(page, { baseUrl, ...login });
    await page.goto(new URL(startPath, baseUrl).toString());
    await page.addStyleTag({ content: CAPTURE_CSS });
    await settle(page);
    await setup(page);

    for (const shot of shots) {
      if (!shot.name) throw new Error('Each shot needs a name');
      // Re-add after any navigation in before/setup
      await page.addStyleTag({ content: CAPTURE_CSS });
      if (shot.before) await shot.before(page);
      if (shot.wait) await page.locator(shot.wait).first().waitFor();
      if (!shot.keepMouse) await page.mouse.move(viewport.width - 1, viewport.height - 1).catch(() => {});
      await settle(page);
      // Grow the viewport to the document instead of Playwright's fullPage, which leaves
      // fixed rails (O3's side nav and action bar) cut off at the original viewport height
      if (shot.fullPage) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: viewport.width, height });
        await settle(page);
      }
      const padding = shot.padding ?? (shot.crop ? 16 : 0);
      const clip = await resolveCrop(page, shot.crop, padding);
      const file = path.resolve(outDir, `${shot.name}.png`);
      await page.screenshot({ path: file, clip: clip ?? undefined, animations: 'disabled', caret: 'hide', scale: 'device' });
      if (shot.fullPage) await page.setViewportSize(viewport);
      const stats = optimize ? optimizePng(file, { mode: optimize, quality }) : { before: fs.statSync(file).size, after: fs.statSync(file).size, quantized: false };
      const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]).toString().match(/\d+(?=\n|$)/g).map(Number);
      const result = { file, width: dims[0], height: dims[1], kb: Math.round(stats.after / 1024), rawKb: Math.round(stats.before / 1024), quantized: stats.quantized };
      console.log(`${shot.name}.png  ${result.width}x${result.height}  ${result.rawKb} KB -> ${result.kb} KB${stats.quantized ? ' (quantized)' : ''}`);
      results.push(result);
    }
    return results;
  } finally {
    await browser.close();
  }
}

module.exports = { captureShots, openmrsLogin, optimizePng, settle, sleep };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const flag = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv.splice(i, 2)[1];
  };
  const bool = (name) => {
    const i = argv.indexOf(name);
    return i !== -1 && !!argv.splice(i, 1);
  };
  const crop = flag('--crop');
  const padding = flag('--padding');
  const dsf = flag('--dsf');
  const wait = flag('--wait');
  const vp = flag('--viewport');
  const fullPage = bool('--full-page');
  const lossless = bool('--lossless');
  const noOptimize = bool('--no-optimize');
  const noLogin = bool('--no-login');
  const [url, out] = argv;
  if (!url || !out) {
    console.error('usage: node screenshot.js <url> <out.png> [--crop <selector>] [--padding 16] [--dsf 3] [--full-page] [--wait <selector>] [--viewport 1280x800] [--lossless] [--no-optimize] [--no-login]');
    process.exit(2);
  }
  const u = new URL(url);
  const [w, h] = (vp ?? '1280x800').split('x').map(Number);
  captureShots({
    baseUrl: u.origin,
    login: noLogin ? false : {},
    startPath: u.pathname + u.search + u.hash,
    shots: [{ name: path.basename(out, '.png'), crop, padding: padding && Number(padding), fullPage, wait }],
    outDir: path.dirname(path.resolve(out)),
    dsf: dsf ? Number(dsf) : undefined,
    viewport: { width: w, height: h },
    optimize: noOptimize ? false : lossless ? 'lossless' : 'lossy',
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
