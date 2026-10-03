---
name: brag
description: Update the brag document with recent work by pulling git activity across all OpenMRS repos.
disable-model-invocation: true
argument-hint: [month e.g. "february 2026"]
---

Update the brag document at `~/.claude/brag-doc.md` with recent work. Follow these steps:

1. Read the current brag doc at `~/.claude/brag-doc.md`.

2. Determine the target month. If `$ARGUMENTS` is provided, use that (e.g., "february 2026"). Otherwise, use the current month.

3. Find all `openmrs-esm-*` and `openmrs-module-*` repos directly under `~/Code/OpenMRS/`, skipping review clones (`ls -d ~/Code/OpenMRS/openmrs-esm-*/ ~/Code/OpenMRS/openmrs-module-*/ | grep -v -- '-review/$'`). Don't descend into `~/Code/OpenMRS/worktrees/`. Review clones and worktrees are PR checkouts of the same repos, so their default branch would double-count your commits. Count each commit SHA once.

4. For each repo, collect your commits for the target month. Read the default branch (`git -C <repo> symbolic-ref --short refs/remotes/origin/HEAD`, else `origin/main` or `origin/master`) after a `git -C <repo> fetch --quiet`, and filter by email (`git config user.email`). Most clones sit on a feature branch where squash-merged work doesn't show, and your commits use more than one author name. For example: `git -C <repo> log origin/main --author="$(git config user.email)" --since='<YYYY-MM-01> 00:00' --until='<first day of next month> 00:00'`.

5. Check for PRs authored by `@me` that were merged or opened during the target month. A month can exceed 100 PRs, so keep the high limit:
   - Merged: `gh search prs --author="@me" --merged-at="<YYYY-MM-01>..<last day of month>" --limit 1000 --json number,title,repository,url,closedAt`
   - Opened: `gh search prs --author="@me" --created="<YYYY-MM-01>..<last day of month>" --limit 1000 --json number,title,repository,url,state,createdAt`

6. Categorize the work into sections matching the existing brag doc structure:
   - **Releases**: Version numbers and repo names
   - **Bug fixes and stability**: What was broken, what the fix enabled. Frame by user impact.
   - **Features**: New capabilities, with ticket numbers where available.
   - **Chores**: Dependency bumps, tooling changes, cleanup.

7. If the target month already has an entry in the brag doc, merge new items into the existing sections rather than duplicating. If it doesn't exist, add a new month heading under the correct year.

8. Review the "Themes to track" section at the bottom. If the new work introduces a pattern not yet captured, add it.

9. Write the updated brag doc back to `~/.claude/brag-doc.md`.

10. Show a summary of what was added.
