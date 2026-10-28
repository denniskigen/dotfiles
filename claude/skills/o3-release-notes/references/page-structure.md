# Page structure

The finished 3.8.0 page (913113089) has these sections, in this order. The wiki template (326402049)
has followed this structure since v17 (October 2026), with placeholders and red template notes.

## Key Points
Planned freeze and first release candidate dates, release date, release manager, and "Where to find it"
(demo at o3.openmrs.org, download at openmrs.org/download).

## Key Features
One bullet per feature: a bold label, a colon, then one to three plain sentences on what users can now
do. Say when something is optional, off by default, or needs configuration or a privilege. Performance
bullets give the measured figure and name what was compared (for 3.8.0: 3.7.1 against a 3.8.0
pre-release build from 27 September, same server; Platform search figures from openmrs-core#6342).

## Breaking Changes
Opens with "Check the items that apply to your site below before upgrading:", then groups by audience:
- For every site
- Sites with custom roles (new privilege checks, new privileges a button or page needs)
- Sites running their own mix of backend modules (minimum Platform versions)
- Custom frontend modules and distributions (Core vN): removed APIs, peer dependencies, build changes,
  and a link to the published migration guide
- Sites using the demo content package

Each bullet says what changed and what to do about it (the global property to set, the privilege to add).

## Known Issues
"Fixes for these are planned for x.y.z." Then one bullet per issue: Jira key, what the user sees, and the
fix's state with its PR ("The fix is in progress (repo#n)" or "The fix has been merged (repo#n)").

## Deferred
Bold label, what it is, and where it stands (prototype server, RFC accepted, in review). Shorter items
can be one line, but use the same bold-label form.

## Contributors
- Community PR reviewers by organization (only people with reviews in this release)
- Contributors by organization, alphabetical, then Independent contributors
- Translation contributors: "<Language> updated by <Transifex user>"
- Contributor Metrics: number of PRs, number of organizations, share from OpenMRS Support, a one-sentence
  method note, the bar chart, and a Source link to the release's tab in the contributions sheet (all
  from `scripts/org_contributions.py`)

## Highlights for Implementers
A one-column table. Each row: bold title with an emoji, then what changes for a site and why it helps.
Sub-bullets for rows that cover several changes. End with an "Also in this release" row.

## Example Visual Changes
Five screenshots with captions, one per headline feature (see `screenshots.md`).

## Detailed Changelog
Layout: a Code heading with the Distro RefApp at full width, then Frontend Modules and Backend Modules
in two columns side by side, then a Tickets heading at full width.

- Distro RefApp: compare link from the previous release tag to the new one, then a one-line summary.
- Frontend Modules and Backend Modules: `Name: old → [new](release link) (*major/minor/patch*)` then a
  summary, or a header line with one short bullet per item for the big modules. New modules say
  "new in x.y.z". Use a compare link when a tag has no release page.
- Platform: version link plus the notable changes; "Platform changes" under Tickets links the compare view.
- Tickets: the O3 Jira release page.
