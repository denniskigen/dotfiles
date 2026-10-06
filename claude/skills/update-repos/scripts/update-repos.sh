#!/usr/bin/env bash
# Fast-forward every clean, non-diverged OpenMRS clone to its upstream.
# Never merges, rebases, resets or stashes.
set -u

# Repos live directly under ~/Code on some machines and under ~/Code/OpenMRS on
# others. A glob that matches nothing stays literal and fails the git check below.
for repo in ~/Code/openmrs-*/ ~/Code/OpenMRS/openmrs-*/; do
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
