# Drawing an O3 pictogram

Read this before drawing a new pictogram.

## Start from the rendering contract, not from memory

Read the current code before drawing, because everything below depends on it:

- `packages/framework/esm-styleguide/src/svg-utils.ts` (`addSvg`, `flushSvgs`)
- `packages/framework/esm-styleguide/src/pictograms/pictograms.tsx` (`Pictogram`)
- `packages/framework/esm-styleguide/src/pictograms/pictograms.module.scss`

As of 2026-10 the contract is:

- `addSvg(id, svgString)` puts the raw SVG, with `id` set, into a hidden `#omrs-svgs-container` div (a sprite).
- `Pictogram` renders `<svg width={size} height={size}><use href="#id"/></svg>`. `size` defaults to 92 and must be between 27 and 144.
- The styleguide SVGs have no `viewBox`, so `<use>` draws them at 1:1 in user units: a drawing that spans 16–64 occupies those pixels of the 92px box.
- The build's SVG optimiser merges paths that share a fill, so a registered symbol usually ends up with one path per colour. That's expected when inspecting the DOM.
- RTL mirrors the pictogram horizontally (`[dir='rtl'] .pictogram`), so avoid shapes whose meaning depends on direction, such as text.

If this has changed, follow the code, and update `preview.mjs` to match before trusting its output.

## Three different "bounds"

Keep these apart:

1. **SVG coordinates:** where the paths are. Measure with `svg-bounds.mjs`, which reports the current set's range per edge and flags outliers.
2. **The display box:** the `size` the component renders at (92px by default). With no `viewBox`, coordinates map straight onto it.
3. **Optical balance:** how heavy the pictogram looks next to the title and beside other pictograms. Only a render tells you this (`preview.mjs --header`, then the real component).

The measured range is a starting point, not a rule. Each edge is summarised separately, so the medians don't describe one ideal rectangle. A tall, narrow document and a wide, short box can both be right. Inspect outliers to see why they differ before copying or avoiding them.

## Style

- **Two fills only.** Read them from the current set, which `svg-bounds.mjs` prints for drafts, rather than assuming them. As of 2026-10: `#CEE6E5` (light) and `#7BBCB9` (dark).
- **Light for the main body, dark for the one or two features that identify it.** Look at `registration.svg` (a light card, with the person and plus in dark) and `facility.svg`.
- **Filled shapes, no strokes, no gradients, no white.** The set has no strokes or transforms. `svg-bounds.mjs` warns if a draft does.
- **Rounded corners use a 1.11 radius,** written as `C` curves (for example `...H20C19.387 40 18.89 40.497 18.89 41.11V...`). Copy the idiom from an existing file rather than retyping it. Shapes under about 3 units tall, such as keys or text lines, can use 0.6–1 instead, because 1.11 would turn them into pills.
- **Keep the file shaped like the set:** `<svg xmlns="http://www.w3.org/2000/svg">`, then `<path d="..." fill="..."/>` elements, with no `viewBox`, width, height, ids or metadata. The exception is a provenance comment (see below).

## Adapting a Carbon pictogram

Carbon pictograms are 32×32 single-colour outlines. Use them for the concept and redraw:

- **Turn the outline into filled shapes.** At 92px the silhouette carries the meaning, and interior detail is mostly lost.
- **Replace details that read as status with a domain cue.** In `white-paper`, a check mark reads as "approved". For a clinical document it became a medical cross.
- **Watch interior patterns.** Equal-length bars read as "a page of text". Blocks of different shapes read as "a document laid out in sections". Both are fine, but they mean different things, and equal bars sit close to Billing's receipt.
- **Compare silhouettes, not concepts.** A portrait sheet with a tab at the top and a plus sign reads as `registration`, whatever it's meant to be.

## Provenance

- **If Carbon path data is copied or traced,** add an XML comment at the top of the SVG naming the source, for example `<!-- Adapted from @carbon/pictograms 12.85.0 "white-paper", Apache-2.0 -->`. The comment then travels with the file, and the build strips it from the bundle.
- **If only the concept was borrowed and the drawing is new,** a note in the PR is enough.

This is a practical reading of Apache-2.0, not legal advice. If the project has a stated policy, follow it.
