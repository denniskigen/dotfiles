---
name: biweekly-standup
description: Drafts the bi-weekly standup update at 4 PM EAT on standup Tuesdays, an hour before the 5 PM meeting.
---

Draft my standup update for today's 5 PM EAT standup.

The standup happens every other Tuesday, counting from Tuesday 2026-10-06. This task runs every Tuesday at 4 PM EAT, so first check whether today is a standup day:

```bash
python3 -c "import datetime as d; t = d.date.today(); print(t.weekday() == 1 and (t - d.date(2026, 10, 6)).days % 14 == 0)"
```

If that prints `False`, reply with one line saying this isn't a standup week (or that the app launched too late for today's standup) and stop. Don't gather anything.

If it prints `True`, read `~/.claude/skills/standup/SKILL.md` and follow every step in it to draft the update for the last 2 weeks. OpenMRS repos live directly under `~/Code/` or under `~/Code/OpenMRS/`. Fetch and read each distinct repo once: several folders can be clones or worktrees of the same origin, so count each commit SHA once.

This run is unattended, so step 3 of the skill can't wait for my answers. Instead, put a short "Questions before you send this" list at the top: each piece of in-flight work you found (uncommitted changes, stashes, local branches touched in the period) with one line on what it looks like, so I can say whether it belongs in the update. Then give the full draft in the skill's three buckets (Done, In progress, Blockers / needs from the team), ready to read aloud in under 2 minutes.

Read-only apart from `git fetch`: don't commit, push, post, or change any branch.