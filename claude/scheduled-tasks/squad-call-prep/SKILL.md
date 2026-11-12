---
name: squad-call-prep
description: Each Thursday at noon EAT, preps my notes for the 4 PM O3 squad call: follow-ups from last call, the Squad Dashboard walk-through with what each squad did since, demo and discussion candidates, and announcements. Read-only.
---

Prep my notes for today's weekly O3 squad call (Thursdays, 4 PM to 5 PM EAT). I run the call. It has three parts, and the notes should prep me for each:

1. We walk the Squad Dashboard row by row and ask each squad's lead for an update. The Active squads come first, then the Emerging ones.
2. Demos and design feedback, such as mockups, prototypes and work in progress.
3. "Any other topics", then announcements.

The dashboard is only the start. People bring up things from Talk, GitHub and Jira too, so look there as well.

This run is unattended and read-only. Never post, reply, comment, like, edit, assign or transition anything on Talk, Jira, Confluence or GitHub. Only write files under `~/.claude/squad-agenda/`.

## 0. Check the day

```bash
python3 -c "import datetime as d; n = d.datetime.now(); print(n.weekday() == 3 and n.hour < 16)"
```

If that prints `False`, reply with one line saying it isn't Thursday or the call has already started (the app probably launched late), and stop.

## 1. Work out the window

`SINCE` is 5 PM EAT last Thursday, when the previous call ended:

```bash
python3 -c "import datetime as d; n = d.datetime.now().astimezone(); print((n - d.timedelta(days=7)).replace(hour=17, minute=0, second=0, microsecond=0).isoformat())"
```

## 2. Last call

Read the newest files in `~/.claude/squad-agenda/calls/` dated before today: my notes or posted drafts (`.md`) and the transcript (`.txt`). If last week's transcript isn't there, pull it from Wispr Flow with `python3 -I ~/.claude/squad-agenda/wispr-transcript.py --date <last Thursday YYYY-MM-DD>`. Pull out what people said they'd do or bring back. Transcripts are machine-generated. Names spoken mid-sentence get garbled (e.g. "Shiba" was Chi Bong), and speaker labels are mostly right but sometimes wrong (lines where I was running the call were credited to Burke). Use context to work out who said what. If there's nothing for last week, say so and lean on the dashboard comments in step 3.

## 3. Dashboard

```bash
python3 -I ~/.claude/squad-agenda/squad-dashboard.py
```

It reads the public view behind om.rs/squad-dashboard. It prints the ideas in the order the view shows them, with squad tags, stage, leads, orgs and the docs, code and discuss links. Save that output to `~/.claude/squad-agenda/snapshots/<today>.json`. Then compare it with the newest earlier snapshot and note any new or removed rows, stage changes, and squad tag changes (e.g. Emerging to Active).

Each week's call notes are posted as comments on the dashboard ideas. I post them after the call, from drafts the `squad-call-notes` task writes. Older ones were typed live by Veronica Muthee. Fetch them with the Atlassian connector's `mcp__4e57915a-eca4-4d72-9db6-a64dc39a0bfa__searchJiraIssuesUsingJql`. Use `cloudId` `openmrs.atlassian.net`, JQL `key in (<all keys>)`, `fields` `["summary", "comment"]`, `responseContentFormat` `markdown` and `maxResults` 50. The response is big and the harness will probably save it to a file. Pull out the latest comment per idea with:

```bash
jq -r '.issues.nodes[] | .key as $k | (.fields.comment.comments | last) as $c | "\($k)\t\($c.created // "-")\t\($c.author.displayName // "-")\t\(($c.body // "-") | gsub("\\s+"; " "))"' <saved file>
```

The latest comment is what the squad said on last week's call.

## 4. Activity since last call

Gather once, then match to squads.

- **GitHub** (if a `gh` command fails with a timeout or network error, wait a few seconds and retry up to twice before listing it under "Couldn't check"): `gh search prs --owner openmrs --updated ">=<SINCE date>" --limit 1000 --json repository,number,title,author,state,isDraft,url,createdAt,updatedAt,closedAt,commentsCount`. Also run `gh search prs --owner openmrs --merged-at ">=<SINCE date>" --limit 1000 --json repository,number,title,author,url` to tell merged from closed. Release bumps, version pins and CI workflow migrations make up a large share of these. Count them in one line and don't list them.
- **Talk**: `python3 -I ~/.claude/community-watch/talk-scan.py --since <SINCE> --dry --max-topics 150`. Always pass `--dry` so the community-watch state isn't touched. Use `new_topics`, `my_topics` and `other_activity`, and ignore the mention sections. If you need more than the excerpt, read a topic with `https://talk.openmrs.org/t/<id>/last.json` and a browser User-Agent header (the script shows how).
- **Jira**: use the same connector, `fields` `["summary", "status", "assignee", "reporter", "priority", "created", "updated", "labels"]` and `maxResults` 100. Run:
  - `project = O3 AND updated >= "<SINCE as yyyy-MM-dd HH:mm>" ORDER BY updated DESC`
  - `project = O3 AND summary ~ "Release" AND statusCategory != Done ORDER BY created DESC` to see where the current release stands.
- Skim this week's `~/.claude/community-watch/digests/*.md` too. They're already summarised.

Match activity to a squad by:
- the idea's `code` repo and its `docs` and `discuss` links
- Talk topic titles and Jira summaries that name the feature
- PR authors you can tie to a lead (check the PR body or the lead's name if unsure)
- anything the last-call notes said was coming (e.g. "PRs once the release is out", "a Talk post for feedback")

Don't force a match. Unmatched but notable items go in step 5.

## 5. Demo and discussion candidates

Look for things worth screen time or a group decision:
- new mockups or Figma or prototype links
- Talk threads asking for design or product feedback, including any Talk post someone promised on last week's call
- O3-relevant Talk threads that ended on an unanswered question or proposal, or that got lots of replies without a conclusion
- architectural PRs: new extension points or APIs, breaking changes, major version bumps, big drafts
- PRs stuck on disagreement or waiting on review for more than a week in `openmrs-esm-*` repos
- new High or Highest O3 bugs
- decisions left open last week (e.g. "include registration core in the RefApp distro")

Rank them. Keep at most five.

## 6. Deliver

Save to `~/.claude/squad-agenda/agendas/<today YYYY-MM-DD>.md`, then reply with the same content.

Format:

```
# O3 squad call prep, <date>

Window: since <SINCE in EAT>.

## Follow-ups from last call
- <who>: <what they said they'd do>. <Done, with link | No sign of it yet>.

## Dashboard walk-through
### <emoji + summary> (<KEY>, <stage>) - <leads>
- Last week: <latest dashboard comment or call note, one line>
- Since then: <PRs, tickets, Talk posts with links, or "Nothing on GitHub, Jira or Talk">
- Ask: <one short question for the lead>

<One block per SQUAD: Active row, then per SQUAD: Emerging row, in the script's order.>

## Other dashboard rows with activity
<Cooling Down and GSOC rows, one line each, only if something happened. Then dashboard changes from the snapshot diff.>

## Demo and discussion candidates
1. <what>, <who'd present>. Why now: <...>. What we need from the group: <...>.

## Announcements
<Release status (which modules are still To Do), upcoming events, calls for help.>

## Couldn't check
<Failed scans, blocked Talk categories, errors.>
```

Write "Ask" lines the way I'd say them on the call: short and direct, like "Chi Bong, did the RDE PRs go up after the release?". Don't pad quiet squads. One line is enough. The whole thing should read in under five minutes.