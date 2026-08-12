---
name: brag
description: Update the brag document with recent work by pulling git activity across all OpenMRS repos.
disable-model-invocation: true
argument-hint: [month e.g. "february 2026"]
---

Update the brag document at `~/.claude/brag-doc.md` with recent work. Follow these steps:

1. Read the current brag doc at `~/.claude/brag-doc.md`.

2. Determine the target month. If `$ARGUMENTS` is provided, use that (e.g., "february 2026"). Otherwise, use the current month.

3. Find all `openmrs-esm-*` and `openmrs-module-*` repos under `~/Code/`. Exclude PR-worktree clones (any directory whose name contains a `-pr<number>` segment, e.g. `*-pr3320-review`, `*-pr2973-claudereview`). Those are pinned PR checkouts and would double-count your commits.

4. For each repo, collect commits authored by the current git user (`git config user.name`) for the target month.

5. Check for PRs authored by `@me` that were merged or opened during the target month using `gh search prs --author="@me"`.

6. Categorize the work into sections matching the existing brag doc structure:
   - **Releases**: Version numbers and repo names
   - **Bug fixes and stability**: What was broken, what the fix enabled. Frame by user impact.
   - **Features**: New capabilities, with ticket numbers where available.
   - **Chores**: Dependency bumps, tooling changes, cleanup.

7. If the target month already has an entry in the brag doc, merge new items into the existing sections rather than duplicating. If it doesn't exist, add a new month heading under the correct year.

8. Review the "Themes to track" section at the bottom. If the new work introduces a pattern not yet captured, add it.

9. Write the updated brag doc back to `~/.claude/brag-doc.md`.

10. Show a summary of what was added.
