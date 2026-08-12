---
name: standup
description: Generate a bi-weekly standup update by pulling git activity across all OpenMRS repos.
disable-model-invocation: true
---

Generate a standup update for the last 2 weeks. Follow these steps:

1. Find all `openmrs-esm-*` and `openmrs-module-*` repos under `~/Code/`. Exclude PR-worktree clones (any directory whose name contains a `-pr<number>` segment, e.g. `*-pr3320-review`, `*-pr2973-claudereview`). Those are pinned PR checkouts and would double-count your commits.

2. For each repo, collect commits authored by the current git user (`git config user.name`) from the last 2 weeks.

3. Check for in-flight work that commits alone won't surface. In each repo with recent activity, run `git status --short` for uncommitted changes, `git stash list` for parked work, and `git for-each-ref --sort=-committerdate refs/heads --format='%(committerdate:short) %(refname:short) %(upstream:track)'` for local branches touched during the period (including branches that are ahead of their upstream or have no upstream). Summarize what you find and ask whether any of it belongs in the update before writing the final version — don't silently drop it or guess what it is.

4. Check for open PRs authored by `@me` across GitHub using `gh search prs --author="@me" --state=open`. For each open PR, note its review status (approvals, pending review, changes requested) and CI status.

5. Count PRs reviewed during the period using `gh search prs --reviewed-by="@me" --created="<start>..<end>" --limit 100`. Report the count in the **Done** section as a single line (e.g., "Reviewed **N PRs** across X repos").

6. Synthesize into a concise standup update using these three buckets:
   - **Done**: Completed and merged work. Lead with releases. Frame items by impact — describe what was broken or missing for users, not what code changed. For example, say "Lab results with a value of zero were silently disappearing from the patient chart" instead of "Zero values in NumericObservation were being treated as falsy and dropped." Group related items (e.g., "Fixed several bugs where clinical data wasn't displaying correctly") instead of listing individual commits. Include PR references in parentheses for developers, but keep the main description readable by non-technical stakeholders.
   - **In progress**: Open PRs and active work. Note review/CI status. Describe what each PR will improve for users, not just the technical change.
   - **Blockers / needs from the team**: PRs needing review, design decisions pending, anything stalled. Be specific about what you need and from whom.

7. Keep the entire update under 2 minutes of speaking time. Pick the 2-3 most impactful items per bucket. Don't list every commit.

8. Write for a mixed audience of developers and non-technical stakeholders. Lead each item with plain-language impact, then add technical references (repo names, PR numbers) in parentheses so developers can follow up. Avoid jargon like "falsy", "stale state", "E2E", "CI" without explanation — use terms like "automated tests are passing" or "waiting for code review" instead.
