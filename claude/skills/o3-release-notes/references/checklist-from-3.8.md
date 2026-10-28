# Claims that were wrong or missing a caveat in 3.8.0

Check each kind on every release. Sources: the 3.8.0 page's version history (913113089) and the review
sessions behind it.

## Feature exists in code, but the release doesn't turn it on
- Version on the login page: core 11 can show it, but the distro's frontend build never passed
  `openmrs assemble --application-version`, so 3.8.0 showed nothing. Read the distro's build files.
- Scheduled queue clearing: off until `queue.autoCloseQueueEntriesAtTime` is set; blank by default and
  not set by the demo content.

## Feature described as something else
- Service Queues "Clinic Administrator" view is clinic-wide monitoring behind a privilege, not queue and
  room setup (that page already existed).
- Metadata export copies configuration only; it isn't a backup.
- A registration fix described as "relationships are kept when editing" fixed a different bug.

## Scope and data source
- Visit summary PDF: medications, conditions and allergies come from the current patient record, even
  when printing a past visit.
- Diagnosis certainty shows in the visit history and the visit summary, not "across the patient chart".
- The print button needs the `App: Can generate a Visit Summary` privilege; the demo content gives it to
  Doctor and Nurse.

## When something shipped
- Workspace v2 shipped in 3.6.0, not 3.7.0. Check which core version a release shipped.
- A weekly appointments calendar was built and removed during the cycle; it never shipped, so it can't be
  "retired". Check the previous release's module versions.
- Visit note images were already in 3.7.0; 3.8.0 fixed how they're saved and removed.

## Where something runs
- Chart Search AI ran on its own demo server, not dev3. Check the server, not just the repo.

## Numbers
- Speed figures undersold the change until they used measured results, then needed the compared builds
  named. Platform search figures needed their source (openmrs-core#6342).

## Contributors
- Organizations: confirm new people and recheck old ones. One contributor's organization had changed
  since the previous release's notes, and nine PRs done as paid fellowship work belonged under OpenMRS
  Support rather than their author's organization (52.6% to 54.0%). Both came from release team review,
  not from the data; the details are in the private ledger.
- Reviewers: one person was listed without any reviews in the release.

## Screenshots
- The growth chart image had no plotted measurements.
- The visit summary image showed a diagnosis twice, which turned out to be bug O3-6140.

## Mechanical
- A double space after an organization label came back after being fixed once.
- Mixed British and American spelling.
- Blank release date, distro link pointing at an RC tag, migration guide linked as a draft PR.
- Template leftovers: the 3.7 notes kept the planning blurb, including its "Delete this blurb" line, and
  the 3.9.0 planning page inherited the template's notes and example changelog entries.
