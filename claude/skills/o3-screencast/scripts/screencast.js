// High-DPI UI screencasts with Playwright + CDP, encoded to H.264 MP4 by encode.swift.
//
//   const { recordScenario } = require('<skill>/scripts/screencast');
//   recordScenario({ baseUrl, login, setup, scene, crop, out });
//
// See ../SKILL.md for the workflow and ./example-scenario.js for a complete scenario.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPTS = __dirname;

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

// Visible cursor, click ripple, caption bar, and hiding the dev-server error overlay.
// Headless Chromium draws no cursor, so without this a viewer can't follow the clicks.
function overlayInitScript() {
  const install = () => {
    if (document.getElementById('__sc_cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #webpack-dev-server-client-overlay { display: none !important; }
      #__sc_cursor { position: fixed; z-index: 2147483647; pointer-events: none; width: 22px; height: 22px;
        transform: translate(-3px, -2px); left: -100px; top: -100px; }
      .__sc_ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 34px; height: 34px;
        margin: -17px 0 0 -17px; border-radius: 50%; background: rgba(255, 196, 0, .55);
        animation: __sc_r .55s ease-out forwards; }
      @keyframes __sc_r { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.4); opacity: 0 } }
      #__sc_caption { position: fixed; z-index: 2147483645; pointer-events: none; padding: 8px 14px;
        border-radius: 6px; background: rgba(22, 22, 22, .88); color: #fff; display: none;
        font: 600 14px/1.35 'IBM Plex Sans', system-ui, sans-serif; }`;
    document.head.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = '__sc_cursor';
    cursor.innerHTML =
      '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3 2 L3 18 L7.5 13.8 L10.6 20.5 L13.3 19.3 L10.2 12.8 L16.3 12.8 Z" fill="#161616" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cursor);
    const caption = document.createElement('div');
    caption.id = '__sc_caption';
    document.body.appendChild(caption);
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    }, true);
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.className = '__sc_ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 700);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}

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

/** Resolve a crop spec (selector, locator, rect, or async fn) to a CSS-pixel rect, with padding. */
async function resolveCrop(page, crop, padding = 0) {
  if (!crop) return null;
  let rect;
  if (typeof crop === 'function') rect = await crop(page);
  else if (typeof crop === 'string') rect = await page.locator(crop).first().boundingBox();
  else if (typeof crop.boundingBox === 'function') rect = await crop.boundingBox();
  else rect = crop;
  if (!rect) throw new Error('Crop target not found');
  const vp = page.viewportSize();
  const x = Math.max(0, Math.floor(rect.x - padding));
  const y = Math.max(0, Math.floor(rect.y - padding));
  return {
    x,
    y,
    width: Math.min(vp.width - x, Math.ceil(rect.width + padding * 2)),
    height: Math.min(vp.height - y, Math.ceil(rect.height + padding * 2)),
  };
}

function ensureEncoder() {
  const src = path.join(SCRIPTS, 'encode.swift');
  const bin = path.join(SCRIPTS, '.bin', 'encode');
  if (!fs.existsSync(bin) || fs.statSync(bin).mtimeMs < fs.statSync(src).mtimeMs) {
    fs.mkdirSync(path.dirname(bin), { recursive: true });
    execFileSync('swiftc', ['-O', '-suppress-warnings', src, '-o', bin], { stdio: 'inherit' });
  }
  return bin;
}

/**
 * Records `scene` (setup is not recorded) and writes an H.264 MP4.
 *
 * opts.baseUrl     origin of the app, e.g. http://localhost:8130
 * opts.login       false, or { username, password, location } for OpenMRS REST login
 * opts.startPath   path to open before setup (relative to baseUrl)
 * opts.setup       async (page, h) => {}  bring the UI to the starting state (not recorded)
 * opts.crop        selector | locator | {x,y,width,height} | async (page) => rect   (CSS px, resolved after setup)
 * opts.cropPadding CSS px added around the crop target (default 0)
 * opts.scene       async (page, h) => {}  the recorded part; drive it with h.click / h.caption / h.sleep
 * opts.out         output .mp4 path
 * opts.dsf         device scale factor (default 3; 2 is the minimum for retina)
 * opts.viewport    CSS viewport (default 1280x800)
 * opts.fps         output frame rate (default 60)
 */
async function recordScenario(opts) {
  const {
    baseUrl,
    login = false,
    startPath = '/',
    setup = async () => {},
    scene,
    crop = null,
    cropPadding = 0,
    out,
    dsf = 3,
    viewport = { width: 1280, height: 800 },
    fps = 60,
    keepFrames = false,
  } = opts;
  if (!out) throw new Error('opts.out is required');
  const { chromium } = loadPlaywright();
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'screencast-'));

  // The flag is what makes CDP screencast frames come back at device resolution;
  // the context's deviceScaleFactor alone still yields 1x frames.
  const browser = await chromium.launch({ args: [`--force-device-scale-factor=${dsf}`] });
  try {
    const context = await browser.newContext({ viewport, deviceScaleFactor: dsf });
    await context.addInitScript(overlayInitScript);
    const page = await context.newPage();
    if (login) await openmrsLogin(page, { baseUrl, ...login });
    await page.goto(new URL(startPath, baseUrl).toString());

    let cropRect = null;
    const h = {
      sleep,
      /** Move the visible cursor to a locator's centre (or a {x, y} point) in a smooth path. */
      moveTo: async (target, { steps = 28 } = {}) => {
        const p = target.x !== undefined ? target : await target.boundingBox().then((b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 }));
        await page.mouse.move(p.x, p.y, { steps });
      },
      /** Move to the target, pause so viewers see where, then press. */
      click: async (target, { pause = 400 } = {}) => {
        await h.moveTo(target);
        await sleep(pause);
        await page.mouse.down();
        await page.mouse.up();
      },
      /** Type with a visible cadence. */
      type: async (target, text, { delay = 70 } = {}) => {
        await h.click(target);
        await page.keyboard.type(text, { delay });
      },
      /** Show a caption bar at the bottom of the crop area; pass null to hide it. */
      caption: (text) =>
        page.evaluate(
          ({ text, r }) => {
            const c = document.getElementById('__sc_caption');
            if (!text) return void (c.style.display = 'none');
            c.textContent = text;
            c.style.display = 'block';
            c.style.left = r.x + 12 + 'px';
            c.style.maxWidth = r.width - 24 + 'px';
            c.style.bottom = window.innerHeight - (r.y + r.height) + 12 + 'px';
            c.style.top = 'auto';
          },
          { text, r: cropRect ?? { x: 0, y: 0, ...viewport } },
        ),
    };

    await setup(page, h);
    cropRect = await resolveCrop(page, crop, cropPadding);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await sleep(500);

    const cdp = await context.newCDPSession(page);
    const frames = [];
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const file = `f${String(frames.length).padStart(5, '0')}.png`;
      fs.writeFileSync(path.join(framesDir, file), Buffer.from(data, 'base64'));
      frames.push({ file, t: metadata.timestamp });
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    const startWall = Date.now() / 1000;
    await cdp.send('Page.startScreencast', {
      format: 'png',
      maxWidth: viewport.width * dsf,
      maxHeight: viewport.height * dsf,
      everyNthFrame: 1,
    });

    await scene(page, h);

    const stopWall = Date.now() / 1000;
    await cdp.send('Page.stopScreencast');
    await sleep(300);
    if (!frames.length) throw new Error('No frames captured');
    const scaledCrop = cropRect && Object.fromEntries(Object.entries(cropRect).map(([k, v]) => [k, v * dsf]));
    fs.writeFileSync(path.join(framesDir, 'manifest.json'), JSON.stringify({ frames, startWall, stopWall, crop: scaledCrop }));

    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    execFileSync(ensureEncoder(), [framesDir, path.resolve(out), String(fps)], { stdio: 'inherit' });
    return { out: path.resolve(out), frames: frames.length, framesDir: keepFrames ? framesDir : null };
  } finally {
    await browser.close();
    if (!keepFrames) fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

module.exports = { recordScenario, openmrsLogin, sleep };
