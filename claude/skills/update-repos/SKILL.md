---
name: update-repos
description: Fast-forward all local OpenMRS git repos under ~/Code to their upstreams. Safe by design - never touches dirty trees or diverged branches.
disable-model-invocation: true
---

Update the locally cloned OpenMRS repos under `~/Code` to match their upstreams.

This only ever fast-forwards. It never merges, rebases, resets, or stashes, and it leaves any repo with uncommitted changes or a diverged branch untouched. Each repo is updated on whatever branch it currently has checked out, against that branch's tracked upstream.

Run this loop:

```bash
for repo in ~/Code/openmrs-*/; do
  name=$(basename "$repo")
  git -C "$repo" rev-parse --git-dir >/dev/null 2>&1 || continue
  case "$name" in *-review) echo "SKIP    $name (review clone)"; continue ;; esac
  branch=$(git -C "$repo" symbolic-ref --quiet --short HEAD) || { echo "SKIP    $name (detached HEAD)"; continue ; }
  [ -z "$(git -C "$repo" status --porcelain)" ] || { echo "SKIP    $name (uncommitted changes on $branch)"; continue ; }
  upstream=$(git -C "$repo" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null) || { echo "SKIP    $name (no upstream for $branch)"; continue ; }
  git -C "$repo" fetch --quiet --prune 2>/dev/null
  if ! git -C "$repo" rev-parse --verify --quiet "$upstream" >/dev/null; then
    echo "WARN    $name (upstream $upstream gone from remote)"; continue
  fi
  if git -C "$repo" merge-base --is-ancestor "$upstream" HEAD; then
    echo "CURRENT $name ($branch)"
  elif git -C "$repo" pull --ff-only --quiet 2>/dev/null; then
    echo "PULLED  $name ($branch)"
  else
    echo "WARN    $name ($branch diverged from $upstream, needs manual rebase)"
  fi
done
```

Then give a brief summary: how many were pulled, how many were already current, and explicitly list anything marked `SKIP` or `WARN` with its reason, since those are the repos that may need manual attention.

Scope notes:
- Matches `~/Code/openmrs-*` only (esm apps, modules, distro, content, core). Non-OpenMRS repos are left alone.
- Review clones (`*-review`) are skipped on purpose, since they're pinned to a specific PR state.
