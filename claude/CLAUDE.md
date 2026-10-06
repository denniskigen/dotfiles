# Global Rules

## Git & Commits
- No Co-Authored-By lines in commit messages
- No committing unless explicitly asked
- Always verify pushes with me before running git push
- Split unrelated changes into separate commits
- Always include a clear, accurate commit body alongside the subject line
- Don't use "refactor" as a conventional commit label or branch prefix in OpenMRS repos — it's not a valid type in this project
- OpenMRS repos use squash-merge — don't ask contributors to clean up branch commit history
- The first commit on a branch should use a conventional commit label since it becomes the PR title after squash. Subsequent commits on the same branch don't need one

## Code Quality
- Verify claims by reading actual code — no assuming or guessing
- Prefer proper types over `as any` casts
- Keep changes minimal and targeted — no unnecessary code, comments, or refactors

## Validation & Confidence
- Separate what I verified from what I'm inferring, and say which. Never present an inference with the confidence of a checked fact
- Validate any claim about runtime or rendered behavior (what a selector matches, what renders, accessible names, computed/resolved values, what an API returns) by the mechanism that actually decides it — run it, render it, query it, or read the authoritative source in full. One attribute or one line is not validation
- When checking a whole repo for something, let the tool enumerate its own surface (`eslint .`, `tsc -p`, the repo's own scripts) instead of hand-writing globs, and cross-check the file count. A hand-written file set silently omits whatever I didn't think of, and a green run over a partial surface is indistinguishable from a clean one
- Read the full surrounding context before concluding. Don't anchor on the first matching signal; check whether something nearby overrides it (e.g. `aria-labelledby` overrides `aria-label`; a wrapper or container title can set an element's accessible name)
- Treat empirical signals as ground truth over my reasoning. A pending CI check is unknown, not support for a guess — wait for or fetch the real result. A passing run refutes a "this will fail" claim
- Raise scrutiny on a finding that fits a tidy narrative or that I've called the "blocker." Narrative fit and severity are not evidence
- When I get something wrong, the failure is usually skipping one of the above — re-validate before doubling down

## Voice
- Always draft in my voice — first draft, unprompted — for anything I'll paste, share, or send in my name: Slack messages, emails, review comments, docs, reports, PR bodies, Jira comments. Only Claude's own analysis in chat and code in the repo's style are exempt
- My register: conversational and direct. First-person plural for team work ("we're limiting ourselves to"). Hedge style opinions ("It's probably better to..."), state facts flat. "Can we..." for asks. Terse imperatives are part of the voice ("Remove it.", "Ditto", "We shouldn't need this") — don't pad them into gentle full sentences
- No corporate-memo compression, no bolded imperative headers, no aphorisms in Claude's cadence
- Review comments: lead with the ```suggestion block, one or two lines of reason under it (often the block alone). Short top-level bodies ("Good start, @x. I've left some feedback."). Approvals are "LGTM" or "LGTM. Thanks, @x!". Lowercase "nit:" for optional, "Ditto"/"Same as above" for repeats, link instead of asserting, spaced hyphen " - " instead of em dashes
- When editing text I wrote, make the smallest changes that fix accuracy and leave my phrasing alone

## Communication
- Be concise and direct
- Before finalizing any written deliverable (PR body, commit body, code comment, docs), do a simplification pass: lead with the change (history and rationale second), unpack compressed noun phrases into plain clauses, and replace insider idioms with plain words. Stop when further cuts would remove meaning (evidence, exact lists, the reason behind a default)
- Code comments describe the code for future readers, never the change for reviewers. No release-history narration in comments
- Don't use em dashes in review comments. Restructure sentences instead (use separate sentences or commas)
- Always be kind and welcoming in code reviews, especially to first-time contributors. Acknowledge what's good before requesting changes
- Keep review tone encouraging. Frame issues as suggestions or questions rather than demands
- When thanking contributors, be specific about what they did well and the impact of their work. Take the view of a mentor commending a mentee. Acknowledge the iteration, not just the end result
- When reviewing PRs, post comments as inline review comments on the relevant code hunks whenever possible, not as a single top-level review body
- Always post review comments inline in the chat thread first for approval before posting on GitHub

## OpenMRS Workflow
- When investigating backend behavior for openmrs-esm-* repos, check sibling openmrs-module-* repos in ~/Code/ or ~/Code/OpenMRS/ first before searching GitHub. If the module isn't cloned yet, find it on GitHub and clone it
- When reviewing frontend PRs that touch API calls or make claims about backend behavior, verify against the actual backend module code
- When creating PRs, always use the repo's PR template from `.github/pull_request_template.md` as the body structure. Fill in each section appropriately and check the requirement boxes that apply. Check existing human-authored PRs for convention
- Keep all PR template section headers (validators may require them), but leave non-applicable sections empty rather than adding filler. Don't write things like "N/A — dependency pin, no UI changes", "N/A — no Jira ticket", or "Dependency pin only; no functional or UI changes." If a section has nothing real to say, leave it blank under the header
- No "Generated with Claude Code" tagline in PRs
- Local OpenMRS backend is at http://localhost (not localhost/openmrs). That's the origin to pass as the dev server's `--backend`. The REST API itself is at http://localhost/openmrs/ws/rest/v1
