# Example Visual Changes screenshots

Use `o3-screenshot` for the capture mechanics. These notes add what the release notes page needs.

## Match the page
- The 3.8.0 images are stored 2268 px wide on the page. Capture with a 2268 CSS px wide window at
  device scale 3 (6804 px) so all five match.
- Use the release's own frontend if you can. If you use a local nightly, check that nothing changed in
  the screens you capture since the release tags (`git log <tag>..origin/main -- <package paths>` in the
  frontend repos).
- Hide controls that aren't part of the feature: `button[aria-label="Toggle Implementer Tools"]` (pinned
  to the bottom of the window for admins), `button[aria-label="Help menu"]`, and scrollbars
  (`scrollbar-width: none` and `::-webkit-scrollbar { display: none }`).

## Visit summary PDF preview
The patient chart shows the PDF in an iframe, so the capture depends on Chrome's PDF viewer.
- Playwright's default headless shell has no PDF viewer.
- The viewer sizes itself from the screen's scale, so the screen and the page scale must match. Two
  setups worked:
  - Installed Chrome (`channel: 'chrome'`, Chrome 150) with `--force-device-scale-factor=3` and a
    context with `deviceScaleFactor: 3`. To get the original's 75% zoom without the thumbnail sidebar,
    reload the iframe through `about:blank` with `#zoom=75&navpanes=0` appended to its blob URL (a hash
    change alone doesn't reload the viewer). Chrome 150 shortens the file name in the toolbar, so the
    toolbar is complete.
  - Playwright's Chromium (`channel: 'chromium'`) with `--force-device-scale-factor=3`,
    `--window-size=W,H+87` and `viewport: null`, then clicking the viewer's menu button to close the
    sidebar. `#navpanes=0` does nothing there. Chromium 134 didn't shorten the long file name, which
    can push the zoom controls out of view.
- The preview frame is `min-height: 50vh`, so the window height decides how much of the PDF shows. Pick
  it so the preview ends in white space after the Diagnoses table.

## Test data on the local backend
- Growth chart: a child under five whose record has no existing weights. Some demo children carry adult
  weights (76 kg on a three-year-old), so query FHIR `Observation?patient=<uuid>&code=5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`
  first. Add past checkup visits with weight and height near the WHO median, and today's vitals.
- Visit summary: a visit note saved once and never edited (patientdocuments 1.2.0 prints diagnoses a
  later edit voided, O3-6140). 1.2.0 lists the newest diagnosis first, so record the primary last.
- Service queues: get a queue number from the `queue-entry-number` endpoint, then `POST /visit-queue-entry`.
  Wait-time colors need `waitTimeThresholds`; set it only in the capture browser through
  `localStorage['openmrs:temporaryConfig']` from an init script.
- Metadata export: packages show "No builds" until a build is triggered from the package's View panel.
- Void every visit you created when you're done, and don't touch patients' existing active visits.

## Upload
Upload through the page's attachments form (see the Confluence image upload memory). Re-uploading a file
with the same name replaces the embedded image without a body edit.

## 3.8.0 scripts
In `~/Code/o3-release-notes-archive/3.8.0/`:
- `retake-49b07a1f/`: `capture.js`, `capture2.js` (queue, metadata export, diagnosis), `seed_queue.py`,
  `seed_metadata.js`, `build_package.js`
- `main-d936daf7/recovered/shots/`: `release-shots.js` (growth chart, visit summary with installed
  Chrome), `seed_child.py`
