---
name: morning
description: Start-of-day context pack for OpenMRS work. Freshens local repos, then surfaces what needs attention today: PRs awaiting your review, your open PRs by status, assigned Jira issues, and local loose ends. Sorts everything into "your turn" vs "waiting on others".
disable-model-invocation: true
---

Generate a morning context pack for the day's OpenMRS work. The goal is a short, prioritized triage board of what needs attention now, split into "your turn" and "waiting on others". It is not a report and not a narrative. Follow these steps:

1. Freshen local repos.
   - Run the `update-repos` skill to fast-forward local OpenMRS repos under `~/Code/`. It is safe by design and only touches clean, non-diverged branches.
   - Summarize in one line: which repos advanced. Do not list repos that were already up to date.

2. PRs awaiting your review.
   - `gh search prs "org:openmrs" --review-requested=@me --state=open --json number,title,url,repository,updatedAt --limit 50`.
   - OpenMRS requests review from teams you belong to, so this list runs long and is padded with automated dependency bumps. Do not dump all of it.
   - Report the total count, then split it:
     - Automated bumps (dependabot; titles like `Bump ...` or `(chore): Bump`): collapse into one line with a count and the repos, for example "12 dependency bumps across esm-core, batch-reviewable".
     - Human PRs: list individually, most recently updated first, capped at the 8 newest. Show repo, title, and link.
   - All of these are your turn, but the human PRs get your attention first.

3. Your open PRs and their status.
   - Find them: `gh search prs "archived:false" --owner=openmrs --author=@me --state=open --json number,title,url,repository`.
   - Two deliberate filters:
     - `--owner=openmrs` scopes to current work. An unscoped `--author=@me` drags in years-old PRs from other orgs (AMPATH, personal forks).
     - `archived:false` drops PRs on archived repos (for example `openmrs-esm-task-list`). Those repos are frozen read-only, so the PRs cannot be closed or merged and are pure noise on a daily board.
   - Pass `archived:false` as the query term and scope with the `--owner` flag. Do not fold both into one `"org:openmrs archived:false"` string; gh mis-parses it as a single quoted owner and the search fails.
   - For each, fetch detail: `gh pr view <number> --repo <owner/repo> --json reviewDecision,statusCheckRollup,mergeable`.
   - Classify each PR:
     - Approved and CI green: your turn, ready to merge.
     - `CHANGES_REQUESTED`: your turn, address the feedback.
     - CI failing or merge conflict: your turn, fix it.
     - Review still required and CI green: waiting on others, no action.

4. Assigned Jira issues.
   - Query via the Jira MCP with JQL `assignee = "Dennis Kigen" AND statusCategory != Done AND status != "Parking lot" ORDER BY updated DESC`.
   - Use the display name `"Dennis Kigen"`, not `currentUser()`. The Jira MCP authenticates as a different account, so `currentUser()` resolves to the wrong user and returns nothing assigned to you.
   - If the Jira MCP is not connected or errors, note that in one line and continue. Do not block the brief on Jira.
   - In-progress and PR-pending issues are your turn. To-do issues are your turn to start or plan. `Parking lot` is excluded as backlog.

5. Local loose ends.
   - Across the same repos, excluding `-pr<number>` worktrees (for example `*-pr3320-review`), find working trees with uncommitted changes and branches holding commits not yet pushed to their upstream.
   - List them so nothing is stranded. These are the easiest things to forget overnight.

6. Synthesize the brief. Two buckets, prioritized:
   - **Your turn today**: reviews requested, your PRs needing action (merge, address, or fix), in-progress Jira, and local loose ends. Order by what unblocks other people or ships value first.
   - **Waiting on others**: your PRs pending review with green CI. One line each, no action needed.
   - Keep it tight and scannable. If a bucket is empty, say so in one line rather than padding it.
