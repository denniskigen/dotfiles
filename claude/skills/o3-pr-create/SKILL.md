---
name: o3-pr-create
description: "Use when opening a pull request on an OpenMRS or O3 repo: branching, writing conventional commits, drafting the PR body from the repo template, pushing, and following up on Greptile's review. Pairs with o3-pr-review."
---

# O3 PR Create

Use this to ship a change as a PR on an `openmrs-esm-*`, `openmrs-module-*`, or other OpenMRS repo: create the branch, write the commit(s), draft the PR body from the repo's template, push, and open the PR with `gh`. This is the outbound counterpart to `o3-pr-review`.

If the user invoked this skill themselves (`/o3-pr-create`) or asked for the commit, that authorizes the commit step for the described change. If you loaded it on your own, confirm before committing. Pushing and opening the PR are gated separately and must be confirmed (see Approval Gates).

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
   - Valid labels: `feat`, `fix`, `chore`, `docs`, `test`, and `BREAKING` for breaking changes. The shared frontend PR title check rejects anything else. Do not use `refactor`.
   - Always include a clear, accurate commit body alongside the subject, explaining what changed and why.
   - No `Co-Authored-By` lines. No "Generated with Claude Code" tagline.
   - No em dashes in commit text. Restructure with periods or commas.

4. Self-review the branch before pushing.
   - Review the branch with the `o3-pr-review` skill in Pre-PR Self-Review Mode, treating it as any other contributor's PR.
   - Share the findings in chat first. Fix real findings on the branch once the user agrees, before drafting the PR body. If the fixes add commits, review only those commits (Rereview Mode).
   - Once the review is clean, or the user has decided on every finding, record the reviewed HEAD from the repo directory, in its own command: `~/.claude/skills/o3-pr-create/scripts/self-review-gate.sh --mark`.
   - A PreToolUse hook blocks `gh pr create` in any repo with an OpenMRS remote until HEAD is recorded, so a commit added after the mark needs its own review. Only the user can waive the review.

5. Draft the PR title and body for approval.
   - Read `.github/pull_request_template.md` in the repo and use it as the body structure. Templates differ per repo, so read the actual file each time. Backend repos differ: `openmrs-core`, `openmrs-module-webservices.rest` and `openmrs-module-fhir2` use an uppercase `.github/PULL_REQUEST_TEMPLATE.md` with their own sections, and many modules (queue, emrapi, billing) have none. With no template, copy the shape of recent merged human-authored PRs in that repo.
   - Keep every template section header (validators may require them). Leave a section blank under its header when there is nothing real to say, except Summary: where the frontend PR description check runs, it fails on an empty Summary. Do not write filler like "N/A", "no UI changes", or "dependency pin only".
   - Write the prose as a human would: describe the problem and the change directly. Skip generic Summary/Motivation/Test-plan scaffolding unless the template's own headers call for it.
   - Write the PR body and commit bodies in my register (see the Voice section in the global CLAUDE.md): plain prose, mechanism-first, no report scaffolding.
   - Check the requirement boxes that genuinely apply (conventional-commit title with ticket number, designs linked, tests included or validated by existing tests, and in esm-core, updated framework and storybook mocks for API changes). Leave a box unchecked if it does not apply, rather than checking it to look complete. Where the PR description check runs, the first box (title) must be checked or the check fails.
   - Title: `(type) O3-1234: Sentence case summary`, or `(type) Sentence case summary` when there's no ticket. Use `(BREAKING)` in place of the type for breaking changes. This becomes the squash PR title. `openmrs-module-*` repos usually drop the label (`O3-1234: Summary`, `RESTWS-1053: Summary`), so check existing human-authored PR titles for convention.
   - Add the Jira link to the Related Issue section when a ticket exists.
   - For UI changes, flag that a screenshot or recording is needed in the Screenshots section. You cannot capture it; ask the user to add it.
   - No em dashes anywhere in the body.
   - Show the full draft (title plus body) to the user and get approval before creating the PR.

6. Push (gated).
   - Confirm with the user before running `git push`. This is a hard rule, even when the skill was explicitly invoked.
   - Push the branch to the contributor's fork or the upstream remote per the repo's contribution model.

7. Open the PR (gated).
   - Create the PR with `gh pr create` using the approved title and body.
   - Do not open the PR until the current HEAD is self-reviewed, the push is done, and the body is approved.
   - Report the PR URL. Note any follow-ups: screenshot still needed, paired backend/distro PR to land first, or Transifex sync for new strings.

8. Watch for Greptile's review.
   - Greptile (`greptile-apps[bot]`) reviews new PRs on most O3 repos, usually 2 to 7 minutes after they open. It skips PRs from `openmrs-bot`.
   - Right after opening the PR, run `~/.claude/skills/o3-pr-create/scripts/greptile.sh <owner/repo> <number> --wait` in the background. On a repo where Greptile has never commented it returns at once. Otherwise it waits up to 15 minutes, then prints Greptile's summary, inline findings, findings outside the diff, and TREX test run. Run it without `--wait` to re-read them later.
   - Treat each finding as an unverified claim. Check it against the code with the Finding Validation Gate in `o3-pr-review` before acting on it, and share the verdicts in chat. The P1/P2 badges are Greptile's own ranking, not a verdict.
   - Fix real findings on the branch (push gated as above). For each finding, draft a short thread reply in my voice: the commit that fixes it, or why it doesn't apply. Post replies only after approval. Greptile answers replies in its threads.
   - Greptile doesn't re-review when you push. To have it re-check after fixes, ask before posting a PR comment that mentions `@greptileai`.
   - TREX obstacles about a backend that isn't running or missing test data describe Greptile's test environment, not the PR. Skip them.

## Approval Gates

Hard stops, in order:

- Commit: authorized when the user invoked this skill or asked for the commit; otherwise confirm first. Still show the commit plan (subjects and which files go in which commit) before committing if the change spans multiple concerns.
- Push: never run `git push` without explicit confirmation in this session.
- Open PR: never run `gh pr create` until the current HEAD has been self-reviewed and the title and body are approved verbatim.

## Commit Conventions

- First commit on the branch carries the conventional label and becomes the PR title after squash. Later commits on the same branch do not need a label.
- OpenMRS repos use squash-merge. Do not craft or clean up branch commit history for a tidy log; it gets squashed.
- Split unrelated changes into separate commits.
- Subject plus accurate body. No `Co-Authored-By`, no Claude tagline, no em dashes.
- Never `refactor` as a label.

## PR Body Rules

- Structure from the repo's PR template (`.github/pull_request_template.md`, or uppercase `PULL_REQUEST_TEMPLATE.md` in backend repos), read fresh each time. No template: follow recent merged PRs.
- Keep all section headers. Leave non-applicable sections blank under the header, no filler text. Summary is never blank.
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

- Repos live under `~/Code/OpenMRS/`.
- Use the `gh` CLI for GitHub operations.
- Translations: hand-edit only `en.json`; other locales sync via Transifex.
- Default local backend base URL is `http://localhost`.
- For changes touching API behavior, verify against the sibling `openmrs-module-*` repo before describing backend behavior in the PR body.

## Output Shape

1. Branch name and why (new branch vs existing).
2. Commit plan: subject lines, bodies, and which files belong to each commit.
3. Self-review findings from `o3-pr-review`, shared in chat for approval before any fixes.
4. Draft PR title (conventional, with ticket number when present).
5. Draft PR body filled from the repo template, headers kept, non-applicable sections blank, applicable boxes checked.
6. Outstanding gates: confirm push, then confirm PR creation.
7. After creation: the PR URL and any follow-ups (screenshot, paired PR, Transifex).
8. Once Greptile's review lands: a verdict on each finding, fixes made, and drafted thread replies for approval.

## Attribution
- Never include a Claude attribution footer in PR bodies, comments or review replies,
  e.g. `---` followed by `_Generated by [Claude Code](https://claude.ai/code/...)_`.
- Some GitHub create-PR tools append that footer automatically (`gh pr create` does not). After creating a PR,
  re-read its body and, if a footer was added, ask the user before removing it with an update, then confirm it's gone.
- Leave `Co-Authored-By:` and `Claude-Session:` trailers out of commit messages.
