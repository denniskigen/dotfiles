---
name: o3-release-notes
description: "Use when drafting, fact-checking, reviewing or finishing the release notes for an O3 reference application release on the OpenMRS wiki (\"Release Notes 3.x.x\" pages): building the module changelog, checking key features and breaking changes against the code, known issues and deferred items, contributor lists and metrics, example screenshots, and the release-day updates. Built from the 3.8.0 release notes (Oct 2026)."
---

# O3 Release Notes

How to produce an accurate O3 release notes page. Most of the work is evidence, not prose: in 3.8.0,
about 12 of the 28 described page saves corrected facts against code, Jira or benchmarks, about 7 fixed
contributor data, about 4 changed order or structure, and only about 5 were mechanical.

## Split the work by what decides the answer

| Kind of step | Examples | Where it lives |
|---|---|---|
| One right answer, given the tags | module versions between releases, commits per range, PR counts, Jira lists | `scripts/`, run, never retyped by hand |
| Public and costly if wrong | feature claims, breaking changes, contributor organizations, metrics | evidence (code at the release tag, Jira, PR, benchmark) plus the release team's sign-off |
| Judgment | which features lead, wording, what implementers need to hear | this file's guidance; the release manager decides |

A claim on the page needs evidence you can point to: a file and line at the release tag, a merged PR, a
Jira issue, or a benchmark with its build named. If you can't find it, say so on the page or leave it out.

## Pages and sources

- 3.8.0 notes, the current model of a finished page: page 913113089. Template: page 326402049, which
  has followed the 3.8.0 structure since v19 (October 2026; see `references/page-structure.md`).
  Template instructions are red text, "Template note:" lines and "(<-- example only)" markers.
- Next release's page starts as a planning page (feature owners, requirement links). Rewrite it into
  release notes near the cut; don't delete the planning content without the release manager.
- While it's a planning page, compare the plan with the previous release's Deferred list and Known
  Issues, and with what the release planning calls decided (Dennis records them in Wispr Flow; the
  squad call memory has the transcript script). Items dropped from the plan should be said so on the
  page, not silently left out.
- Distro: `~/Code/openmrs-distro-referenceapplication`. Frontend versions are in
  `frontend/spa-assemble-config.json`, backend and Platform versions are `<name.version>` properties in
  `distro/pom.xml`.
- Contributor counts go into the "Release Org Contributions to PRs" Google Sheet, one tab per release;
  the page's Contributor Metrics "Source" link points at that release's tab.
- People ledger (private, not in this repo): `~/Code/o3-release-notes-archive/ledger/`.
- 3.8.0 working files and scripts: `~/Code/o3-release-notes-archive/3.8.0/` (see its README).

## Workflow

### 1. Gather the facts (scripts)

1. Module changes: `python3 scripts/distro_diff.py <prev-tag> <new-tag> --repo ~/Code/openmrs-distro-referenceapplication`.
   - Compare final tags. RC tags pin frontend modules to `latest`, and the script flags them.
   - Libraries bundled into apps aren't pinned in the distro: the React form engine
     (`openmrs-esm-form-engine-lib`) and the Angular form engine (`openmrs-ngx-formentry`). Read the
     consuming apps' `package.json` at both tags.
   - For each change, link the GitHub release (or a compare view when a tag has no release page) and
     summarize from the release notes and merged PRs.
2. Commits for the contributor ledger: write a `ranges.tsv` (repo, from-tag, to-tag) from step 1, then
   `scripts/collect_commits.sh ranges.tsv > commits.tsv`. Tag names vary by repo (`v1.2.3`, `1.2.3`,
   `queue-3.0.0`, `authentication-2.3.0`, billing's `v2.3.0` then `2.5.0`); check them with
   `gh api repos/openmrs/<repo>/tags`. The script exits 1 and names the range when a tag is wrong.
3. Known issues: Jira bugs with fixVersion = the next RefApp version that affect this release, plus any
   bug found while reviewing the page or its screenshots (3.8.0 found O3-6140 that way). For each, note
   the fix PR and its state.
4. Translators: Transifex activity for project `o:openmrs:p:openmrs3` in the release window (3.8.0's
   `tx_contributors.py` in the archive; needs `TX_TOKEN` or `~/.transifexrc`).
5. Reviewers: PR reviews on the release's merged PRs (3.8.0's `reviews.py` in the archive). List only
   people with at least one review in this release.

### 2. Write and check the content (evidence)

- Check every Key Features, Breaking Changes and Highlights claim against the code at the release tags,
  and cite what you checked. `references/checklist-from-3.8.md` lists the kinds of claims that were wrong
  in 3.8.0; check each kind. For backend claims use `o3-backend-check`; for a claim that would embarrass
  the release if wrong, get a second opinion with `cross-check`.
- Defaults and gates matter: say when something is off by default, needs a global property, a
  privilege, or a configuration change, and what the demo content sets.
- Numbers name their source: the builds compared, the dataset, the PR or benchmark.
- Don't call something new if it shipped earlier, and don't list a removal of something that never
  shipped. Check the previous release's notes and changelog.
- Breaking Changes are grouped by who is affected (see `references/page-structure.md`), each with what to do.
- Deferred: compare the planning list with what merged. Keep items that are still planned, with status.

### 3. Contributors and metrics (data)

1. From the `commits.tsv` of step 1.2, run
   `python3 scripts/org_contributions.py commits.tsv <out-dir> --from <prev> --to <new>`. It counts merged
   PRs across the frontend, backend, distro and content repos, excluding bots, translation syncs and
   release commits, with Platform (`openmrs-core`) PRs counted separately. It writes the per-PR review
   list (`prs.tsv`), people with their organizations (`contributors.tsv`), the sheet CSVs, the metrics
   numbers and method sentence (`metrics.txt`) and the chart (`chart.png`) in one go, so they can't
   disagree. The chart is drawn with `uv run`, which installs matplotlib on first use.
2. It exits 1 when PR authors aren't in `ledger/people.tsv`. Add each one with a source (earlier notes,
   a confirmation from Dennis or the person, a GitHub profile marked "confirm"), then run it again.
   Don't change someone's organization without recording why. Per-PR exceptions (3.8.0: fellowship PRs
   counted as OpenMRS Support) go in `ledger/pr-overrides.tsv`.
3. Have the release team review `prs.tsv` and `contributors.tsv` before the numbers go on the page. Both
   organization corrections in 3.8.0 came from the release team, not from the data.
4. Put `sheet.csv` in the release's sheet tab and `sheet-platform.csv` in its Platform tab, upload
   `chart.png`, and copy the numbers and method sentence from `metrics.txt`. After any ledger change,
   rerun step 1 (not the commit collection) and update all four, re-uploading the chart under the same
   file name.
5. After changing the script, check it against 3.8.0: running it on
   `~/Code/o3-release-notes-archive/3.8.0/contributors/commits.tsv` with `--from 3.7.1 --to 3.8.0` must
   give 639 PRs, 9 organizations and 54.0% (OpenMRS Support 345, Independent 167, UW ITECH DIGI 93).

### 4. Screenshots

Follow `references/screenshots.md` (scale, PDF preview, hidden controls, test data per screen). Look at
each image and ask whether it shows the feature working. In 3.8.0 the growth chart had no plotted
measurements and the visit summary showed a duplicate-diagnosis bug.

### 5. Edit the page

- Read the page's version history first and again just before saving. Others (Veronica, Jayasanka,
  Nethmi, Ian, Dennis) edit in parallel. See the memories on Confluence live-doc saves and image uploads.
- Prefer targeted, version-checked edits (v2 API, ADF, `version.number` = current + 1) and verify that
  only the intended text changed.
- Keep other people's wording. Make the smallest change that fixes accuracy; Veronica's Key Features and
  Highlights wording was restored once in 3.8.0 after a heavier rewrite.
- Write a version message that says what changed and why.

### 6. Release day

- Release date in Key Points; distro changelog link ends at the final tag, not an RC.
- Rerun `distro_diff.py` and the contributor collection against the final tags; update the changelog,
  sheet tab, chart and metrics text together.
- Mark the RefApp version (and its RC versions) released in Jira.
- Refresh Known Issues (fix merged / in progress) and swap links to drafts for the published pages
  (for 3.8.0, the Core v11 migration guide).
- Check that openmrs.org/download lists the new release, and that the o3-docs release PR is merged.
- Delete the planning blurb ("Have a feature to request or suggest?") and every template instruction.

### 7. Final pass (mechanical)

Before calling the page done, check: links resolve; every changed module from `distro_diff.py` appears
in the changelog with matching versions; Jira keys exist and their stated status is current; no
placeholders or TBDs; consistent American spelling; no double spaces after labels; the chart matches the
metrics text. A script for this doesn't exist yet. Write one when this checklist is run a second time.

Template leftovers to search for (the 3.7 notes still had the planning blurb months after release):
"Delete this blurb", "Have a feature to request", "Template note", "example only", "needs hyperlink",
`____`, `x.y.z`, `<old version>`, `YYYY-MM-DD`, `@name`, and any remaining red (#bf2600) text.

## Style

- American spelling (color, favorite, enrollment), matching the O3 UI.
- Plain words and short sentences. Lead each bullet with a bold label and a colon.
- Key Features order: performance, then what clinicians and front-desk staff will notice, then admin
  features, then platform and packaging (standalone, version display) last.
- Highlights for Implementers explain the benefit for a site, not the implementation.
