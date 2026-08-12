---
name: o3-pr-create
description: "Use when opening a pull request on an OpenMRS or O3 repo: branching, writing conventional commits, drafting the PR body from the repo template, and pushing. Pairs with o3-pr-review."
---

# O3 PR Create

Use this to ship a change as a PR on an `openmrs-esm-*`, `openmrs-module-*`, or other OpenMRS repo: create the branch, write the commit(s), draft the PR body from the repo's template, push, and open the PR with `gh`. This is the outbound counterpart to `o3-pr-review`.

Invoking this skill authorizes the commit step for the described change. Pushing and opening the PR are gated separately and must be confirmed (see Approval Gates).

## Workflow

1. Understand and scope the change.
   - Read the working tree or staged diff. Confirm what the change does and why.
   - Split unrelated changes into separate commits. If the diff mixes concerns (a fix plus a drive-by cleanup), commit them separately rather than as one blob.
   - If strings changed, only `en.json` is edited by hand. Other locales sync via Transifex, so do not add or edit other locale files.
   - Identify the Jira ticket if one exists (O3-XXXX). It belongs in the PR title and the Related Issue section.

2. Branch if needed.
   - If on the default branch (`main`/`master`), create a branch first. Never commit the change directly to the default branch.
   - Name the branch by the repo's convention. Check recent branches and merged PRs for the pattern (often the Jira key, e.g. `O3-1234`, or a short `feat/...`, `fix/...` slug).
   - Do not use `refactor` as a branch prefix in OpenMRS repos. It is not a valid type in this project.

3. Write the commit(s).
   - The first commit on the branch must use a conventional commit label, because after squash-merge it becomes the PR title. Subsequent commits on the same branch do not need a label.
   - Valid labels for OpenMRS repos: `feat`, `fix`, `chore`, `docs`, `test`, `style`, `perf`, `build`, `ci`. Do not use `refactor`.
   - Always include a clear, accurate commit body alongside the subject, explaining what changed and why.
   - No `Co-Authored-By` lines. No "Generated with Claude Code" tagline.
   - No em dashes in commit text. Restructure with periods or commas.

4. Draft the PR title and body for approval.
   - Read `.github/pull_request_template.md` in the repo and use it as the body structure. Templates differ per repo, so read the actual file each time.
   - Keep every template section header (validators may require them). Leave a section blank under its header when there is nothing real to say. Do not write filler like "N/A", "no UI changes", or "dependency pin only".
   - Write the prose as a human would: describe the problem and the change directly. Skip generic Summary/Motivation/Test-plan scaffolding unless the template's own headers call for it.
   - Write the PR body and commit bodies in my register (see the Voice section in the global CLAUDE.md): plain prose, mechanism-first, no report scaffolding.
   - Check the requirement boxes that genuinely apply (conventional-commit title with ticket number, designs linked, tests included or validated by existing tests). Leave a box unchecked if it does not apply, rather than checking it to look complete.
   - Title: conventional-commit format including the ticket number when one exists. This becomes the squash PR title. Check existing human-authored PR titles for convention.
   - Add the Jira link to the Related Issue section when a ticket exists.
   - For UI changes, flag that a screenshot or recording is needed in the Screenshots section. You cannot capture it; ask the user to add it.
   - No em dashes anywhere in the body.
   - Show the full draft (title plus body) to the user and get approval before creating the PR.

5. Push (gated).
   - Confirm with the user before running `git push`. This is a hard rule, even when the skill was explicitly invoked.
   - Push the branch to the contributor's fork or the upstream remote per the repo's contribution model.

6. Open the PR (gated).
   - Create the PR with `gh pr create` using the approved title and body.
   - Do not open the PR until both the push is done and the body is approved.
   - Report the PR URL. Note any follow-ups: screenshot still needed, paired backend/distro PR to land first, or Transifex sync for new strings.

7. Self-review the PR.
   - Right after creating the PR, review it with the `o3-pr-review` skill, treating it as any other contributor's PR.
   - Share the findings in chat first. Do not post anything to the PR or push fixes without approval.
   - If a finding is real, fix it on the branch (push gated as above) rather than leaving it for reviewers to catch.

## Approval Gates

Hard stops, in order:

- Commit: authorized by invoking this skill for the described change. Still show the commit plan (subjects and which files go in which commit) before committing if the change spans multiple concerns.
- Push: never run `git push` without explicit confirmation in this session.
- Open PR: never run `gh pr create` until the title and body are approved verbatim.

## Commit Conventions

- First commit on the branch carries the conventional label and becomes the PR title after squash. Later commits on the same branch do not need a label.
- OpenMRS repos use squash-merge. Do not craft or clean up branch commit history for a tidy log; it gets squashed.
- Split unrelated changes into separate commits.
- Subject plus accurate body. No `Co-Authored-By`, no Claude tagline, no em dashes.
- Never `refactor` as a label.

## PR Body Rules

- Structure from the repo's `.github/pull_request_template.md`, read fresh each time.
- Keep all section headers. Leave non-applicable sections blank under the header, no filler text.
- Humanize the prose. No default report scaffolding unless the template requires it.
- Check only the requirement boxes that truly apply.
- No "Generated with Claude Code" tagline. No em dashes.

## Simplification Pass

Run this on the commit body and PR body before showing the draft, and on any code comments the change adds:

- Lead with the change. The first sentence says what the PR does; history and rationale come after.
- Unpack compressed noun phrases ("preset scoping negatives") into plain clauses ("test rules stay scoped to their own files").
- Replace insider idioms ("rides the release", "ratcheting") with plain words.
- Code comments describe the code for future readers, not the change for reviewers. No release-history narration ("1.0.0 shipped this by mistake") in comments; that story lives in the commit and PR.
- Stop at meaning. Evidence, exact lists, and the reason behind a default are content, not padding; cutting them simplifies the prose by removing the information.

The test for done: a reviewer gets the whole change from the first sentence, and no phrase needs a second read to unpack.

## OpenMRS Defaults

- Repos live under `~/Code/`.
- Use the `gh` CLI for GitHub operations.
- Translations: hand-edit only `en.json`; other locales sync via Transifex.
- Default local backend base URL is `http://localhost`.
- For changes touching API behavior, verify against the sibling `openmrs-module-*` repo before describing backend behavior in the PR body.

## Output Shape

1. Branch name and why (new branch vs existing).
2. Commit plan: subject lines, bodies, and which files belong to each commit.
3. Draft PR title (conventional, with ticket number when present).
4. Draft PR body filled from the repo template, headers kept, non-applicable sections blank, applicable boxes checked.
5. Outstanding gates: confirm push, then confirm PR creation.
6. After creation: the PR URL and any follow-ups (screenshot, paired PR, Transifex).
7. Self-review findings from `o3-pr-review`, shared in chat for approval before any fixes or PR comments.
