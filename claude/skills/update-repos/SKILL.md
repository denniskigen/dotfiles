---
name: update-repos
description: Fast-forward all local OpenMRS git repos under ~/Code/OpenMRS to their upstreams. Safe by design - never touches dirty trees or diverged branches.
disable-model-invocation: true
---

Update the locally cloned OpenMRS repos under `~/Code/OpenMRS` to match their upstreams.

This only ever fast-forwards. It never merges, rebases, resets, or stashes, and it leaves any repo with uncommitted changes or a diverged branch untouched. Each repo is updated on whatever branch it currently has checked out, against that branch's tracked upstream.

Run `~/.claude/skills/update-repos/scripts/update-repos.sh`. If the loop needs to change, change the script.

Then give a brief summary: how many were pulled, how many were already current, and explicitly list anything marked `SKIP` or `WARN` with its reason, since those are the repos that may need manual attention.

Scope notes:
- Matches `~/Code/OpenMRS/openmrs-*` only (esm apps, modules, distro, content, core). Non-OpenMRS repos are left alone.
- Review clones (`*-review`) are skipped on purpose, since they're pinned to a specific PR state.
