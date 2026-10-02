---
name: o3-screencast
description: "Use when recording a video of a web UI: a bug repro for a PR review, a before/after or demo clip for a PR body, or any 'record/make a video/screencast/clip of this' request. Produces retina (2x-3x) H.264 MP4s with a visible cursor, click ripples, and captions, cropped to the part of the screen that matters. Built for O3 against a local OpenMRS backend, but works for any page Playwright can reach."
---

# O3 Screencast

Records a scripted, captioned, high-DPI MP4 of a UI interaction. The scenario is code, so a recording can be re-run after a fix or tweaked without redoing it by hand.

`scripts/screencast.js` drives Chromium through Playwright and captures frames with CDP `Page.startScreencast`. `scripts/encode.swift` turns them into a constant-frame-rate H.264 MP4 through AVFoundation, because the only ffmpeg on this machine is Playwright's VP8-only build. Both Swift tools are compiled on first use into `scripts/.bin/`.

## Workflow

1. **Reproduce first, record second.** Confirm the behavior in the app (Browser pane or a quick Playwright run) and read the DOM state that proves it. Never script a recording of behavior you haven't seen happen.
2. **Get the app running.** For O3 frontend changes, serve the PR's packages with esm-core's CLI against the local backend (see O3 setup below). For a deployed site, use its URL directly.
3. **Write the scenario.** Copy `scripts/example-scenario.js` to the session scratchpad and edit it:
   - `setup` brings the UI to the starting state. It is not recorded, so do slow searches and data entry there.
   - `crop` frames only what matters (a workspace, a modal, a table) so details are legible when GitHub scales the video down.
   - `scene` is the recorded part. Use `h.click` / `h.moveTo` / `h.type` so the cursor visibly travels, and `h.sleep` so each change is on screen long enough to read (about 1.5 s after a click, 2-3 s on a caption).
   - Read the DOM state inside the scene and `console.log` it, and build the final caption from that state. A caption must describe what the recording shows, never what the bug is expected to do.
4. **Run it**: `node <scenario>.js <out.mp4>`.
5. **Check it before sharing.** Pull stills with `node scripts/stills.js <out.mp4> <dir> 0.5 3.5 9` and look at them: crop, caption placement, cursor position, and that the key moment is actually visible. Re-run with adjusted timing if a change happens off-camera.
6. **Deliver.** Copy the MP4 into a session folder (for example `<repo>/.claude/recordings/`) and send it with SendUserFile. GitHub only takes video attachments by drag-and-drop into a comment, so the user uploads it. Keep files under 10 MB, GitHub's limit on free plans. A 10 s cropped clip at 3x is under 1 MB.

## Defaults and options

`recordScenario({ baseUrl, login, startPath, setup, crop, cropPadding, scene, out, dsf, viewport, fps })`

- `dsf: 3` (default) gives 3840x2400 frames for a 1280x800 viewport. Use 2 for plain retina. Capture runs at about 19 fps during motion either way, and the encoder holds each frame until the next to produce smooth constant 60 fps output.
- `login: { username, password, location }` authenticates through `/ws/rest/v1/session` and sets the session location, skipping the login and location screens. Use the backend's demo credentials. This is only for local development backends.
- `crop` accepts a selector, a Playwright locator, a CSS-pixel rect, or `async (page) => rect`. It is resolved after `setup`. O3 styles are CSS-module hashed, so when there is no stable selector, compute the rect from stable anchors (a form, a heading's text, an element id), as the example does.
- Captions sit at the bottom of the crop. Style: numbered steps for actions ("1. Tick Primary on Hypertension"), a "Goal:" line first when intent matters, a "Result:" line last.

## O3 setup

- Serve PR packages from a worktree with esm-core's CLI, one `--sources` per package the scene touches:
  `node packages/tooling/openmrs/dist/cli.js develop --sources <worktree>/packages/<app> --backend http://localhost --port <free port> --open false`
  Run it from the esm-core checkout through a `.claude/launch.json` entry and `preview_start`. The patient-chart CLI fails against newer backends.
- Worktrees need the per-entry `node_modules` link dir (workspace packages linked inside the worktree), or the build resolves another branch's code.
- The dev server's type-check overlay often shows framework-version errors that don't matter. The recorder hides `#webpack-dev-server-client-overlay` automatically.
- The demo patient set on the local backend is stable. Pick a patient with an active visit through `/ws/rest/v1/visit?includeInactive=false`.
- Prefer flows that don't save. If a scene must save, tell the user what test data it created and offer to void it.

## Gotchas

- `--force-device-scale-factor` on launch is what makes screencast frames come back at device resolution. The context's `deviceScaleFactor` alone still yields 1x frames.
- The screencast only emits frames when pixels change. The recorder records wall-clock start and stop times and the encoder holds the last frame until stop, so a closing caption stays on screen for its full `sleep`.
- Don't drive recordings from the Browser pane. Its emulated viewports are scaled, coordinate clicks land off target, and hover tooltips can stick over content. Use the pane to explore and verify, and this recorder to capture.
- Carbon checkboxes hide the real input. Click the `label.cds--checkbox-label` (or the row) rather than the `input`.
- Locate rows by role and name (`getByRole('group', { name })`) for setup, but click by position (`rows.first()`) when the point of the repro is that content moved under the pointer.
