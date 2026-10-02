# Integrating a pictogram

The repo decides what an integration PR contains. Work it out from the current code and workflows each time. A previous PR is a starting point, not a specification, because these conventions change. For example, pictogram PRs committed the generated docs by hand in September 2026, and a month later a docs bot owned them and CI rejected hand edits.

## esm-core: find the current shape

1. **Find the latest similar PR:** `git log --oneline -5 -- packages/framework/esm-styleguide/src/pictograms/` in an up-to-date esm-core checkout, then `git show --stat <sha>` (or `gh pr view <n> --json files`). That gives the candidate file list.
2. **Check each file against the current code:**
   - The SVG in `src/pictograms/svgs/`.
   - `pictogram-registration.ts`: an import plus an `addPictogramSvg('omrs-pict-<name>', ...)` call.
   - `pictograms.tsx`: an entry in `pictogramIds`, plus the component export in the existing `memo(forwardRef(...))` form.
   - The styleguide mocks (`mock.tsx`, `mock-jest.tsx`). Check whether the framework mocks re-export them.
   - The Storybook mocks, if the PR template asks for them.
   - A changeset (`.changeset/`), matching the labels and bump level of recent pictogram changesets.
   - Keep entries alphabetical where the neighbours are.
3. **Use the same id string in all four places:** the `addPictogramSvg` id, the `pictogramIds` entry, the export's `pictogram="..."`, and the SVG file it imports. A mismatch renders as an empty box with no error.
4. **Several pages at once:** put all the new pictograms in one esm-core PR with one changeset. One `next` release then unblocks every app PR that uses them.
5. **Generated docs:** read `.github/workflows/` for docs workflows (search for `esm-framework/docs`) before touching `packages/framework/esm-framework/docs/`.
   - As of 2026-10, a bot regenerates them when the PR is approved. The drift check fails hand edits to the docs. It also fails any PR that changes framework source feeding the docs, and `pictograms.tsx` counts, until the bot's "Docs / Regenerated" run passes on the head commit. A red drift check before approval is expected, whether or not the docs end up changing.
   - If the workflows say otherwise, follow them.
6. **Read `.github/pull_request_template.md`** and recent human-authored pictogram PRs for title and body conventions.

## Verify locally with the real component

- **Storybook:** the styleguide has a pictogram gallery story. Find its id from `/index.json` rather than guessing. Check that the new `<use href="#omrs-pict-<name>">` resolves to a registered symbol and is visible.
- **App shell:** run the esm-core CLI from the branch against the app's package (`openmrs develop --sources <app package> --backend <url>`), with an uncommitted edit in the app that uses the new pictogram.
  - Expect a TypeScript overlay, because the app's types come from the published framework, which doesn't have the export yet.
  - Dismiss it. It doesn't block rendering.
  - The dev server only serves the apps passed with `--sources`. Every other page comes from the published import map, so a page you didn't pass shows the released version with no new header. Pass every app worktree you want to check. One server can take several `--sources`.
  - Check that the header's top equals the navbar's bottom. Negative margins that offset a container's padding (Reports' breadcrumb slot had `-32px`) pull a flush header under the navbar once the padding moves.
- **Screenshots** for the PR come from this real render, captured at 2× (for example a Playwright context with `deviceScaleFactor: 2`, signed in through the local REST session endpoint with the repo's test credentials).
  - **For a before shot,** copy the changed files aside, restore the committed versions, capture, then copy them back. Check that the diff matches a saved patch exactly.
  - **Crop to the header region.** As of 2026-10, GitHub shows PR body images about 782px wide at a 1440px viewport. A full-width 1440px shot shrinks the pictogram to about half size and baked-in labels to about 8px. The left 720px of the page, covering the navbar, the header and a little content, shows the pictogram near its real 92px.
  - **Add a contact sheet** of the new pictograms next to the existing set at 92px. It's the evidence that they stay distinct.
  - **After the user uploads the images,** set descriptive alt text. GitHub uses the filename. Re-read the live body first, change only the `alt` attributes, and keep its line endings.
  - If an image has to be uploaded through a signed-in browser and none is available, give the user the file to add themselves.

## Pre-push hooks and CI (check these each time)

These are things to check, observed in 2026-10, not fixed rules:

- **esm-core's pre-push hook runs `yarn verify`** (lint, test and typecheck across the monorepo).
  - In a fresh worktree, tests can fail on unbuilt `dist/` output (missing `esm-framework/dist/index.js`, or a missing app shell `dist`).
  - Build first, using the repo's own build script.
  - If a test intermittently can't find a `dist` file while a build is running in the same run, rerun before investigating.
- **App worktrees:** if a commit hook fails because `.husky/_/husky.sh` is missing, copy `.husky/_` in from the main checkout (it's gitignored). If a `yarn` script can't find a local binary such as `rspack`, run it from `node_modules/.bin`.
- **`gh pr edit` can fail** with a "Projects (classic) is being deprecated" GraphQL error. Updating the body through the REST API (`gh api -X PATCH repos/<owner>/<repo>/pulls/<n> -F body=@file`) works.
- **Read a failing check's log before blaming the change.** esm-core's `markdown-link-check` scans every Markdown file and has failed on HTTP 503s from GitHub links in the PR template. Compare with recent runs on main, then rerun.
- **The bundle-size bot** (compressed-size-action) reports a renamed chunk as one file removed and another added. To check its numbers, build main and the branch the same way and compare the chunk that contains the header. Removing an inline illustration saved about 0.4 kB gzipped in Dispensing.

## Consumer apps

- **An app can only import the new pictogram once a framework release containing it is published,** usually the `next` pre-release after the esm-core PR merges. Check with `npm view @openmrs/esm-framework@next version` and the changelog, or install it and look for the export.
- **The app-side change:**
  - Replace `illustration={<></>}` with the pictogram, and delete any comment explaining the empty fragment.
  - Give the header the bottom border other headers use (applied through `className`; `PageHeader` doesn't add one).
  - Make sure page content has space below the header.
  - Remove any padding that was working around the missing pictogram.
  - A known-good example from 2026-10 (Visit Summary Configuration):

    ```scss
    .header {
      border-bottom: 1px solid colors.$gray-20;
      margin-bottom: layout.$spacing-05;
    }
    ```

  - Measure afterwards with `measure-header.js`: the header sits flush under the nav, the content starts 16px below it, and nothing scrolls horizontally on narrow screens.
  - If a full-width bar sits directly under the header (Dispensing's Fill prescription bar), keep the border and drop the 16px margin, as Laboratory does. Otherwise the bar floats on the page background.
- **Hand-built headers** that copy `PageHeader`'s markup should move onto `PageHeader` and `PageHeaderContent`, with app controls as extra children (see Laboratory and Appointments). `PageHeaderContent` shows the implementation name ("Clinic") above the title, so a header with its own labels changes visibly: Dispensing went from "Pharmacy / Home" to "Clinic / Pharmacy". Say so in the PR, and remove translation keys that are no longer used.
- **App tests:** a test that renders the new header fails with "Element type is invalid … got: undefined" until the framework mock includes the export. That's the same release dependency as the typecheck. If you add a header test that checks a date, set the fake clock in local time (`new Date(2026, 9, 2, 9, 15)`), because running vitest outside the repo's script uses the machine's timezone.
- **If a contributor PR already addresses the same page** (for example by padding the header), suggest the pictogram change on that PR rather than opening a second one. Do this only if reviewing it is within what the user asked for.
- **Inline review suggestions can only target lines in the diff.** Changes outside the hunk, such as an import, go in the comment text.
