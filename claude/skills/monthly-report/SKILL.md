---
name: monthly-report
description: Generate the monthly contractor-report deliverables (PDP narrative, commit-links, leadership-row evidence, Slack variant) for pasting into the user's Professional Development Plan.
disable-model-invocation: true
argument-hint: [month e.g. "march 2026"]
---

Generate paste-ready blocks for the user's monthly contractor report. The destination is their Professional Development Plan (PDP) Google Sheet:

https://docs.google.com/spreadsheets/d/16RflO3NbTXM-6ttepxhGwmJF6SwMpl61l0LGNpf0Qi8/edit?gid=396280843#gid=396280843

Each month in that sheet has six rows: one "Prioritization" row with a narrative in column F and commit-search URLs in column G, plus five leadership/mentorship rows that take short dash-bulleted evidence in column F. The exact row numbers increment by month; find the heading `Learning & Achievement Goals: <Month Year>` in the sheet and the next six rows are that month's cells.

## Steps

1. **Determine target month.** If `$ARGUMENTS` is provided (e.g., "march 2026"), use it. Otherwise default to the previous calendar month relative to today.

2. **Compute the date range:**
   - `since` = last calendar day of the month before target (e.g., for March 2026 → `2026-02-28`)
   - `until` = last calendar day of target month (e.g., `2026-03-31`)

3. **Ensure `~/.claude/brag-doc.md` has an entry for the target month.** Read it. If no heading exists for the target month, inline the `/brag` workflow by reading `~/.claude/skills/brag/SKILL.md` and following its steps first, using this skill's target month as brag's target month (brag defaults to the current month otherwise; the `brag` skill is disable-model-invocation, so invoke its steps directly rather than calling it as a skill). Then re-read `brag-doc.md` before continuing.

4. **Gather signals.** Run these in parallel where possible:

   a. **PRs authored by me, created in month:**
      ```
      gh search prs --author="@me" --created="<since+1>..<until>" --limit 1000 \
        --json number,title,repository,state,url,createdAt
      ```

   b. **PRs merged in month but created earlier** (catches cross-month work):
      ```
      gh search prs --author="@me" --closed="<since+1>..<until>" --state=closed --limit 1000 \
        --json number,title,repository,state,url,createdAt,closedAt
      ```
      Filter results to `state == "merged"` and `createdAt < since+1` to avoid double-counting (a).

   c. **PRs I reviewed in month:**
      ```
      gh search prs --reviewed-by="@me" --created="<since+1>..<until>" --limit 1000 \
        --json number,title,repository,author,url
      ```
      Aggregate by `repository.name` and by `author.login`. Exclude `openmrs-bot` and self (`denniskigen`). Surface: total PRs reviewed on others' work, distinct contributor count, top contributor by review volume.

   d. **Jira tickets I reported with activity in month:**
      Use `mcp__jira__searchJiraIssues` with `maxResults: 200` and JQL:
      ```
      reporter = "Dennis Kigen" AND updated >= "<since+1>" AND updated < "<until+1>" ORDER BY updated DESC
      ```
      Use the display name, not `currentUser()`: the Jira MCP authenticates as a different account, so `currentUser()` matches the wrong user.
      If the `jira` MCP is down, use the Atlassian connector's `searchJiraIssuesUsingJql` (`cloudId: openmrs.atlassian.net`, `maxResults: 100`, follow `nextPageToken`) with the same JQL.
      Note which are `Done` — those represent completed backlog items the user shaped.

   e. **`o3-docs` PRs merged in month:**
      ```
      gh search prs --author="@me" --repo=openmrs/openmrs-contrib-o3-docs --merged-at="<since+1>..<until>" \
        --limit 100 --json number,title,url,closedAt
      ```

5. **Produce four output blocks in memory** (do NOT write them to files):

   ### Block 1 — F (Prioritization narrative, plain text for Google Sheets)

   Source the prose content from the target-month section of `~/.claude/brag-doc.md`. Organize into numbered themed sections matching the structure of the prior month's narrative in the sheet (check the equivalent row in the previous month for style consistency).

   Conventions (strictly apply):
   - **No inline GitHub PR references.** Strip any `(repo#NNNN)` patterns. JIRA ticket IDs (`O3-XXXX`) are the only citations in prose.
   - **Forward-looking tone for user impact.** Many changes merge in month N but ship to implementations in later months. Use "these changes will benefit users once rolled out", not "clinicians saw improvements".
   - **Role-accurate language.** Use `user` for cross-role workflows (visit creation, queue management, patient search, registration, form filling by any staff). Use `clinician` only for clinical acts (vitals entry, prescribing, visit notes). Use `pharmacist` for dispensing. Use `healthcare worker` as the umbrella term in the impact section.
   - **Non-technical reader.** Replace jargon: "non-atomic" → "two-step process that could leave things half-done"; "falsy check" → "code that treated zero as empty"; "peer dependency" → "dependency version"; "manual portal" / "framework primitive" → plain descriptions of what changed.
   - **End with an "Overall Impact" section** with three subsections: "For Healthcare Workers", "For Implementers", "For the OpenMRS Community".
   - **Em dashes are fine in the narrative.** (The no-em-dash rule only applies to code-review comments.)

   ### Block 2 — G (commit-search URLs, plain text for Google Sheets)

   One line per repo, alphabetized by label, blank line between entries:
   ```
   <Label> https://github.com/<org>/<repo>/commits?author=denniskigen&since=<since>&until=<until>
   ```

   Use the prior month's G cell as the baseline repo list. Add any repos with new authored PRs this month that weren't in the baseline. Keep repos from the baseline even if this month has no commits (consistent list across months).

   ### Block 3 — Leadership-row evidence (F rows 2–5 for the month)

   Rank signals by leverage (durability × breadth). **Drop low-leverage items.** Low-leverage means: scoped to few repos, self-resolved only, minor docs fixes, or already covered by a stronger signal in another row.

   Produce dash-bulleted blocks (matching the existing cell style), labeled by row role:

   - **Align colleagues around shared vision** — cite ecosystem-wide conventions the user authored or drove (e.g., reusable GHA workflows, cross-repo rollouts). Cut if none qualify.
   - **Community task delegation** — lead with the single most-mentored contributor by review count and a qualitative line about guidance. Optional second bullet with the breadth stat (total PRs reviewed on others' work / distinct contributor count).
   - **Leader at the Technical Leadership Table** — cite systemic infrastructure wins and release coordination (e.g., "coordinated N releases across core apps").
   - **O3 Onboarding Resources** — cite any `o3-docs` migration guides or major contributions authored in the month. Cut if none qualify.
   - **Ad-hoc technical support** — usually SKIP. Only include if there's a high-leverage, novel item not already covered by the delegation or leadership-table rows.

   ### Block 4 — Slack DM variant of the narrative

   Same prose as Block 1, but:
   - Section headers become `*Section Title*` (Slack bold, single asterisks)
   - Bullet markers become `•` (literal bullet char)
   - No other formatting changes

6. **Present all four blocks clearly labeled.** Then immediately copy Block 1 (F narrative) to the clipboard using `pbcopy` and report the character count.

7. **Ask which block to copy next.** Options: G commit-links, leadership rows (specify which), Slack variant. On each request, pipe that block to `pbcopy` and confirm.

## Notes

- Brag-doc is the source of truth for the prose content. GitHub and Jira queries only supplement: they source signals for leadership rows and build the commit-links block.
- If you find high-leverage work from the month that wasn't captured in brag-doc, flag it to the user so they can update brag-doc before the narrative is finalized.
- Always convert relative dates in `$ARGUMENTS` to absolute (e.g., "last month" → the previous calendar month relative to today).
- The PDP sheet's row numbers shift each month as new rows are added. Don't hard-code row numbers in the output; the user locates the right row by the month heading.
