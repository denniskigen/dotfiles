---
name: morning-pr-review-drafts
description: Each weekday at 8 AM EAT, finds open OpenMRS PRs awaiting my review with new activity, runs a read-only first pass on each using the o3-pr-review skill, and leaves draft inline comments for me to approve before posting.
---

Draft first-pass reviews for the OpenMRS pull requests that are waiting on me, so I can read and post them when I sit down.

This run is unattended and read-only. Never post comments, reviews, or approvals on GitHub, never push, commit, stash, or switch branches, and never change Jira. The only write you may do to a repo is `git fetch`. Everything you produce is a draft for me to approve.

## 1. Find the candidates

List open PRs where my review is requested (my GitHub login is `denniskigen`):

```bash
gh search prs --review-requested=@me --state=open --json repository,number,title,author,updatedAt,url --limit 100
```

Keep only PRs with activity since the previous weekday morning: `updatedAt` within the last 24 hours, or the last 72 hours when today is Monday. Set aside, without reviewing, any PR authored by `dependabot[bot]` or whose title starts with `(chore): Bump`; list those in one line each at the end instead.

If no PR passes the filter, reply with one line saying nothing new is waiting and stop. Don't write a file.

If more than 5 PRs pass the filter, deep-review the 5 most recently updated and list the rest with one line each under "Not reviewed today" so I can pick them up by hand.

## 2. Review each candidate

For each PR you deep-review, read `~/.claude/skills/o3-pr-review/SKILL.md` and follow it as a first-pass review. In particular:

- Read the full PR discussion first, including inline threads and their resolution state, so you don't duplicate feedback someone already left.
- Prefer local checkouts. OpenMRS repos live directly under `~/Code/` and sometimes under `~/Code/OpenMRS/`; many folders are worktrees of the same origin. Run `git fetch` in the matching clone, then read the PR branch from there. If the repo isn't cloned, review from `gh pr diff` and `gh api` instead of cloning.
- For frontend PRs that touch API calls or claim backend behavior, check the sibling `~/Code/openmrs-module-*` checkout before asserting anything about the backend. Run `git pull` in that module checkout first so you aren't reading stale source. If the module isn't cloned, say so and mark the finding as unverified instead of cloning.
- Validate findings by reading the actual code before reporting them. Separate what you verified from what you're inferring, and label each finding as one or the other.
- If I already reviewed the PR, review only the commits since my last review, and say which SHA you started from.

## 3. Draft the comments

Write every comment in my voice, following the review-comment rules in `~/.claude/CLAUDE.md`: conversational and direct, kind and welcoming, lead with a ```suggestion block where one applies, one or two lines of reason under it, lowercase "nit:" for optional items, "Ditto" or "Same as above" for repeats, links instead of assertions, a spaced hyphen " - " instead of em dashes, and no em dashes anywhere. Acknowledge what's good before requesting changes, especially for first-time contributors. Frame issues as suggestions or questions.

## 4. Deliver

Save the output to `~/.claude/pr-review-drafts/YYYY-MM-DD.md` (create the folder if needed, using today's local date), then reply with the same content in chat.

Format, for each deep-reviewed PR:

- A heading with the repo, PR number as a link, title, and author.
- One line on what the PR does and which review mode you used.
- A proposed top-level body, short, in my voice ("Good start, @x. I've left some feedback." or "LGTM. Thanks, @x!").
- The draft inline comments, each with `file:line`, the comment text, and a one-line note on whether the finding is verified or inferred and how.
- "Things I couldn't check" listing anything that needs a running backend, a browser, or my judgment.

Then the "Not reviewed today" list and the dependabot list, one line each with the link.

Keep it readable in under 10 minutes. If a PR is clean, say so in a sentence rather than inventing findings.