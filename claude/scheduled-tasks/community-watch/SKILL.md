---
name: community-watch
description: Each weekday at 8:30 AM EAT, digests what needs my attention on OpenMRS Talk (mentions, replies, my threads, new relevant topics) and Jira (my issues, mentions, new O3 tickets) since the previous run. Read-only.
---

Build my morning digest of what needs my attention on OpenMRS Talk and OpenMRS Jira since the previous run.

This run is unattended and read-only. Never post, reply, like, comment, transition, assign, or edit anything on Talk or Jira. Never change state anywhere except the two files named in step 4.

## 1. Work out the window

Read `~/.claude/community-watch/state.json` if it exists and take `last_run` as the start of the window. If the file doesn't exist, use 24 hours ago, or 72 hours ago if today is Monday. Call this `SINCE`.

## 2. Talk

Run the scan script. It uses only endpoints that load without a login, reads every topic with activity since `SINCE` across the dev, software, implementing, community, ask and projects categories, and prints JSON:

```bash
python3 -I ~/.claude/community-watch/talk-scan.py
```

(It reads `SINCE` from the same state file and updates `last_run` when it finishes, so run it exactly once. If you need to re-run it, pass `--since <ISO timestamp> --dry`.)

My Talk username is `dennis`. The JSON has these sections, in priority order:

- `mentions`: posts that @mention me.
- `replies_to_me`: direct replies to something I wrote.
- `my_topics`: new posts in threads I've participated in.
- `new_topics`: topics created in the window, with a `keywords` list of O3/frontend terms matched in the title.
- `other_activity`: existing topics that got new posts.
- `errors`: endpoints that failed. If the bot challenge blocked a category, say so in the digest rather than reporting it as quiet.

For anything in the first three sections, open the post URL's topic JSON (`https://talk.openmrs.org/t/<id>/last.json`, with a browser User-Agent header, the script shows how) if the excerpt isn't enough to tell me what's being asked. Tell me in one line what the person wants from me.

## 3. Jira

Use the Atlassian connector, not the `jira` connector. Its tools are `mcp__4e57915a-eca4-4d72-9db6-a64dc39a0bfa__searchJiraIssuesUsingJql` and `mcp__4e57915a-eca4-4d72-9db6-a64dc39a0bfa__getJiraIssue`. Pass `cloudId` as `openmrs.atlassian.net` and `responseContentFormat` as `markdown`. My account id is `712020:711962fb-0754-4e77-ae0b-9d76758b4d10`, display name Dennis Kigen. Format `SINCE` for JQL as `"yyyy-MM-dd HH:mm"`.

Run these searches with `fields` set to `["summary", "status", "assignee", "reporter", "created", "updated", "priority", "comment"]` and `maxResults` 50. Including `comment` returns every comment inline, so one search is usually enough to see what was said.

1. Mine, with activity: `(assignee = currentUser() OR reporter = currentUser() OR watcher = currentUser()) AND updated >= "<SINCE>" ORDER BY updated DESC`
2. Mentions: `comment ~ "712020:711962fb-0754-4e77-ae0b-9d76758b4d10" AND updated >= "<SINCE>" AND NOT (assignee = currentUser() OR reporter = currentUser()) ORDER BY updated DESC`. Keep a hit only if a comment created after `SINCE` mentions me (mentions render as `<custom data-type="mention">@Dennis Kigen</custom>`). Say what the comment asks.
3. New O3 tickets: `project = O3 AND created >= "<SINCE>" ORDER BY created DESC`, with `comment` dropped from the fields. Group release tickets (summary starts with "Release ") into one line with a count, and group any other batch of near-identical summaries from one reporter the same way. For the rest, give key, summary, reporter, and a one-line take on whether it's frontend work I'd normally pick up or review.

For search 1, say what changed. A comment created after `SINCE` is the usual answer: give the gist and who wrote it. If there's no new comment, fetch the change history with `getJiraIssue`, `expand` set to `changelog` and `fields` set to `["summary", "status"]`, and report the entries created after `SINCE` as "field: from -> to" by whom. That response is large and the harness may save it to a file instead of returning it; when it does, pull the entries out with:

```bash
jq -r '.issues.nodes[0].changelog.histories[] | select(.created > "<SINCE as ISO>") | "\(.created) \(.author.displayName): " + ([.items[] | "\(.field): \(.fromString // "-") -> \(.toString // "-")"] | join("; "))' <saved file>
```

Automation comments ("This item is being transitioned...", "marked as done as the PR ... merged") are worth one short clause, not a quote.

## 4. Deliver

Save the digest to `~/.claude/community-watch/digests/YYYY-MM-DD.md` (create the folder if needed, today's local date), then reply with the same content in chat.

Format:

- **Needs a reply from me**: Talk mentions and replies, Jira mentions and comments addressed to me. One bullet each: who, where (link), what they're asking, in one or two sentences.
- **My threads and tickets**: new activity in Talk threads I'm in and on Jira issues I own or watch. One line each with a link and what changed.
- **New on Talk worth a look**: new topics with keyword hits, or anything in dev that touches O3, with a one-line summary. Then a single line listing the other new topics by title.
- **New O3 tickets**: as described above.
- **Other activity**: one line per topic from `other_activity`, title and who posted last. Skip this section if it's longer than ten lines; say "N other threads had activity" instead.
- **Couldn't check**: Talk errors, Jira searches that failed, anything that needs a login.

If every section is empty, reply with one line saying it was quiet and still write the file with that line.

Keep the whole thing readable in under five minutes. Lead with what needs a reply. Don't pad a quiet day.