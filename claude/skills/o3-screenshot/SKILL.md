---
name: o3-screenshot
description: "Use when taking a still screenshot of a web UI: a PR body screenshot, before/after stills, a bug repro image for a review, docs images, or any 'screenshot/capture/grab an image of this' request. Produces 3x (above retina) PNGs cropped to the part that matters, waits for the page to finish loading, and optimizes them with pngquant + optipng (typically 55-65% smaller with no visible loss). Built for O3 against a local OpenMRS backend, but works for any page Playwright can reach."
---

# O3 Screenshot

Captures scripted, high-DPI, optimized PNG stills. The capture is code, so a set of screenshots can be re-run after a fix, or against a second server for a before/after pair, without redoing it by hand.

`scripts/screenshot.js` drives Chromium through Playwright at device scale factor 3 (3840x2400 for a 1280x800 viewport), waits for the page to settle, captures, then optimizes each PNG. Lossy mode runs `pngquant` with a quality floor of 90 and keeps the lossless original if the palette can't hold it. Both modes finish with a lossless `optipng` pass. On the O3 patient chart this measured a mean error of 0.014/255 per channel, with 0.009% of pixels off by more than 8.

## Workflow

1. **See it first.** Confirm the state in the app (Browser pane or a quick Playwright run) before scripting a capture. Never screenshot a state you haven't seen.
2. **Get the app running.** For O3 frontend changes, serve the PR's packages with esm-core's CLI against the local backend (see O3 setup below). The backend's own bundled SPA at `http://localhost/openmrs/spa` works for baseline shots.
3. **Single shot**: use the CLI.
   ```
   node scripts/screenshot.js <url> <out.png> [--crop <selector>] [--padding 16] [--dsf 3] [--full-page] [--wait <selector>] [--viewport 1280x800] [--lossless] [--no-optimize] [--no-login]
   ```
   It logs in with the demo admin credentials and Outpatient Clinic unless `--no-login` is passed.
4. **Several shots or interaction**: copy `scripts/example-shots.js` to the session scratchpad and edit it.
   - `setup` brings the UI to the first state.
   - Each shot has a `name`, an optional `before` (open a workspace, expand a row, fill a field), an optional `wait` selector, and a `crop`.
   - Shots run in order in one page, so later shots build on earlier state.
   - Run it with `node <file>.js <out-dir>`.
5. **Look at every image before sharing.** Read the PNGs. Check that the crop doesn't clip or catch slivers of neighboring UI, that nothing is still loading, and that no tooltip or focus ring is left over. Adjust and re-run.
6. **Deliver.** Copy the PNGs into a session folder (for example `<repo>/.claude/screenshots/`) and send them with SendUserFile. The user drags them into the GitHub comment or PR body. For PR bodies, suggest `<img src="..." width="<pixel width / dsf>">` so a 3x crop displays at its real CSS size instead of being blown up to the column width.

## Defaults and options

`captureShots({ baseUrl, login, startPath, setup, shots, outDir, dsf, viewport, optimize, quality })`

- `dsf: 3` (default). Use 4 for small crops (a button, a tag, an icon) that will be shown large. 2 is plain retina.
- `optimize: 'lossy'` (default), `'lossless'` for pixel-exact output (for example, when the screenshot is about a color or gradient), or `false`.
- `quality: 90` is pngquant's floor. Below it, the shot stays lossless rather than degrading.
- `crop` accepts a selector, a Playwright locator, a CSS-pixel rect, or `async (page) => rect`. Padding defaults to 16 CSS px when cropping. Use `padding: 0` when the crop target has its own border (Carbon tiles, data table containers, the patient banner), or neighboring UI shows at the edges. O3 class names are CSS-module hashed, so anchor on Carbon classes (`.cds--data-table-container`, `form.cds--form`), ARIA (`header[aria-label="patient banner"]`), roles, or ids. Compute a rect when there is no single element, as the example does for the workspace.
- `fullPage: true` grows the viewport to the document height instead of using Playwright's full-page mode. Playwright's mode leaves O3's fixed side nav and action rail cut off at the original viewport height.
- `login: { username, password, location }` authenticates through `/ws/rest/v1/session` and sets the session location. Only for local development backends.

## Before/after pairs

Run the same script against two servers (for example the backend's bundled SPA for "before" and the PR dev server for "after"), with `outDir` set to `before/` and `after/`. Same viewport, same data, same crop, so the only difference is the change.

## O3 setup

- Serve PR packages from a worktree with esm-core's CLI, one `--sources` per package:
  `node packages/tooling/openmrs/dist/cli.js develop --sources <worktree>/packages/<app> --backend http://localhost --port <free port> --open false`
  Run it from the esm-core checkout through a `.claude/launch.json` entry and `preview_start`.
- The demo patient set is stable. Mark Smith (`968f6ebe-769e-43cc-9023-c77414ebc986`) has an active visit and vitals. Find others through `/ws/rest/v1/visit?includeInactive=false`.
- Prefer states that don't save. If a shot needs saved data, tell the user what test data was created and offer to void it.

## What the capture handles

- Waits for network idle, loaded fonts and images, and no Carbon skeletons or spinners. Prints a warning and captures anyway after 15 s, so read the warning and the image.
- Hides the webpack dev-server error overlay, the text caret, and CSS animations, sets reduced motion, and parks the mouse in the bottom-right corner so no hover state sticks.
- Picks the first Playwright install (`PLAYWRIGHT_DIR`, cwd, patient-chart, esm-core) whose Chromium is actually downloaded, since each repo pins its own version.

## Gotchas

- Don't capture from the Browser pane. Its emulated viewports are scaled and its screenshots are 1x. Use the pane to explore, and this script to capture.
- The mouse is parked before each capture, which cancels hover states. For tooltips and hover-only row actions, hover in `before` and set `keepMouse: true` on that shot, with a crop that includes the tooltip.
- A crop that resolves to zero size usually means the element is off-screen. Scroll it into view in `before`, or use `fullPage`.
