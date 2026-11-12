---
name: squad-call-notes
description: Each Thursday at 9 PM EAT, pulls the O3 squad call transcript from Wispr Flow and drafts per-squad update comments for the Squad Dashboard ideas. Drafts only; posts nothing until I approve in the run's session.
---

Draft the Squad Dashboard updates from today's O3 squad call, for me to review and post.

I run the weekly O3 squad call on Thursdays from 4 PM to 5 PM EAT. Wispr Flow records it on this Mac. The call usually has four parts:
1. A release update.
2. A walk through the Squad Dashboard (om.rs/squad-dashboard), asking each squad for an update: Active squads first, then Emerging.
3. Demos and design feedback.
4. Other topics and announcements.

Each squad's update gets posted as a comment on its idea in the OMRS Jira Product Discovery project, so people who missed the call can follow along.

Draft only. Never post, edit, transition or change anything on Jira, Talk, GitHub or Confluence until I reply in this session and approve. Only write files under `~/.claude/squad-agenda/`.

## 1. Find the call

`DATE` is the most recent Thursday, which is today if today is Thursday:

```bash
python3 -c "import datetime as d; t = d.date.today(); print(t - d.timedelta(days=(t.weekday() - 3) % 7))"
```

If `~/.claude/squad-agenda/calls/<DATE>-drafts.md` already exists, reply with one line saying the drafts are already done, and stop.

```bash
python3 -I ~/.claude/squad-agenda/wispr-transcript.py --date <DATE> > ~/.claude/squad-agenda/calls/<DATE>.txt
```

- **Exit code 2:** there's no "O3 Squad Calls" recording for that date. Run `python3 -I ~/.claude/squad-agenda/wispr-transcript.py --list` to check whether it was saved under another title. Say so in one line and stop.
- **Exit code 3:** the transcript isn't ready yet. Say so in one line and stop. I'll click "Run now" later.

The first line of the file gives the recording start time. If it's later than 16:03, the start of the call is missing (usually the release update and the first squad or two). Say so at the top of the drafts and ask me to fill in what was said before recording began.

## 2. Context

- **Dashboard:** `python3 -I ~/.claude/squad-agenda/squad-dashboard.py` lists the ideas in dashboard order, with squad tags, stage, leads, orgs, and docs, code and discuss links.
- **Comments already posted:** use the Atlassian connector's `mcp__4e57915a-eca4-4d72-9db6-a64dc39a0bfa__searchJiraIssuesUsingJql`. Pass `cloudId` `openmrs.atlassian.net`, JQL `key in (<all dashboard keys>)`, `fields` `["summary", "comment"]`, `responseContentFormat` `markdown` and `maxResults` 50. If the harness saves the response to a file, read it with jq. Note anything posted on `DATE`, especially by Veronica Muthee, who has been typing notes live during the call. Also note each idea's previous comment, which is last week's update.
- **Links for the drafts:** look for links to the PRs, releases and Talk threads people mentioned:
  - `gh search prs --owner openmrs --updated ">=<last Thursday>" --limit 1000 --json repository,number,title,author,state,isDraft,url,updatedAt`
  - `gh search prs --owner openmrs --merged-at ">=<last Thursday>" --limit 1000 --json repository,number,title,author,url`
  - the idea's docs and discuss links
  - `gh release list -R openmrs/openmrs-distro-referenceapplication --limit 5` for release status

  Only link what clearly matches what was said. If a match is a guess, mark it in the drafts for me to confirm.

## 3. Draft

Write one comment per dashboard idea that came up, in the order the dashboard lists them. Format, matching my past comments:

```
DD-MM-YYYY

Name: What they said, in plain sentences, with links inline.

Next: who is doing what, if anything was promised.
```

Rules:
- **Write for someone who wasn't on the call.** Short and clear, no filler words carried over from the transcript.
- **Credit whoever gave the update.** That isn't always the listed lead: several squads have more contributors than the dashboard shows. Use full names with capitals (e.g. "Tendo", not "tendo").
- **Don't trust the transcript's names blindly.** Speaker labels are mostly right but sometimes wrong. On Oct 8, lines where I was running the call were credited to Burke. Names said mid-sentence are often garbled ("Shiba" was Chi Bong, "Nethi" was Nethmi, "Bawanthar" was Bawantha). Use context and the dashboard's leads to work out who said what. If you can't tell, flag it.
- **Write release names in full**, e.g. 3.8.0, 3.9.0.
- **Don't use em dashes.** Use plain names, not @mentions.
- **Feedback from a demo on a dashboard idea** goes in that idea's comment as a "Feedback from the call:" list, with who said what.
- **Demos with no dashboard row:** search all OMRS ideas for a match, e.g. `project = OMRS AND summary ~ "<keyword>"`. Name the best match and say whether it's on the dashboard, or say there's no match. Draft the comment anyway.
- **The release update and other announcements** go in the call notes only, not in comments.
- **If Veronica already posted on an idea today,** show her comment next to the draft so I can decide whether to post mine too.

Also write `~/.claude/squad-agenda/calls/<DATE>.md` with short call notes for next week's prep:
- the release update
- one line per squad
- the demos and their feedback
- an "Open follow-ups for next call" list of who promised what

## 4. Deliver

Save the drafts to `~/.claude/squad-agenda/calls/<DATE>-drafts.md`. Then reply with:
1. A "Check before posting" list: guessed links, unsure attributions, missing start of the call, and ideas Veronica already posted on.
2. Each draft under its idea's key and title, exactly as it would be posted.
3. A "Dashboard housekeeping" section, only if something stands out: an idea whose update says it's done or merged, a row with no update in months, or new feature work that isn't on the dashboard. Suggest, don't change.
   - **Before calling a row done,** check its O3 epic for tickets still in progress, not just the latest comment. On Oct 8, rows marked done too early had to be put back.
   - **Before suggesting a new row,** check the squad criteria: feature work on a shared problem, ideally with two or more implementing organizations. Platform upgrades, infrastructure, tooling migrations and one person's project don't qualify.

Keep it short enough to review in about three minutes.

## 5. Posting, only after I approve in this session

When I reply with "post", "post all", a list of keys, or edits:
1. Apply my edits to the drafts.
2. Re-fetch each idea's comments. If someone posted on it since you drafted, show me and wait.
3. Post each approved comment with `mcp__4e57915a-eca4-4d72-9db6-a64dc39a0bfa__addCommentToJiraIssue`, with `cloudId` `openmrs.atlassian.net` and `contentFormat` `markdown`.
4. Save the posted keys and comment IDs to `~/.claude/squad-agenda/calls/<DATE>-posted.json`. Tell me what went up and anything that failed.

Never change idea fields (status, squad tags, leads, title, description) unless I ask for that specific change.