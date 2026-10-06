# o3-pictogram

An agent skill for O3 page header pictograms:
- choosing an existing pictogram or a Carbon concept for a page;
- checking it against pictograms and illustrations already in use;
- drawing it in O3's two-tone style;
- integrating a pictogram in esm-core and the app.

It runs on demand only. In Claude Code, type `/o3-pictogram <page, app path, or PR>`. The `disable-model-invocation: true` frontmatter keeps the model from starting it by itself. Other agents may ignore that field, so ask for the skill by name there.

`SKILL.md` is the entry point for the agent. `drawing.md` and `integration.md` are loaded when needed.

## Install

Copy every file in this gist into one folder named `o3-pictogram` in your agent's skills directory. For Claude Code, that's `~/.claude/skills/o3-pictogram/`. Keep the files together: the scripts import `lib.mjs`.

## Dependencies

- Node 18 or newer. The scripts have no npm dependencies.
- Chrome or Chromium, for rendering. Standard macOS and Linux paths are detected. Otherwise set `CHROME_PATH` or pass `--chrome`.
- Local checkouts of the O3 repos. Set `O3_REPOS_DIR` to the folder that contains them (the default is `~/Code/OpenMRS` if it exists, otherwise `~/Code`), or pass paths explicitly.
- Optional: `gh`, for `inventory.mjs --github`.
- Network access to jsDelivr the first time `carbon-search.mjs` or `preview.mjs --carbon` runs, unless `@carbon/pictograms` is already installed nearby.

## Examples

```bash
# What exists, where it's used, and app-local illustrations (writes a report)
node inventory.mjs --out out/inventory.md

# Carbon concepts for a page's purpose
node carbon-search.mjs document summary print --category Healthcare --category File
node carbon-search.mjs --show white-paper --out out

# Contact sheet plus header preview, rendered the way Pictogram renders today
node preview.mjs --out out --o3 all --carbon white-paper,contract \
  --svg draft=out/draft.svg \
  --jsx form-builder=$O3_REPOS_DIR/openmrs-esm-form-builder/src/components/header/illustration.component.tsx \
  --header draft=out/draft.svg --title "Visit Summary Configuration"

# How a draft's drawn area compares with the current set
node svg-bounds.mjs out/draft.svg
```

`measure-header.js` isn't a CLI. Paste it into a browser console, or a browser JavaScript tool, on the page you want to measure.

All generated files go to the directory you pass. Nothing else is written, apart from a cached copy of the Carbon registry in your temp directory.
