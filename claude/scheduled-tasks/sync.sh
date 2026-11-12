#!/usr/bin/env bash
# Copy scheduled task prompts between this folder and ~/.claude/scheduled-tasks.
# The Claude app only reads a task's SKILL.md from a regular file, so these are
# copies, not symlinks.
#
#   sync.sh       list the tasks whose two copies differ
#   sync.sh in    repo -> ~/.claude, e.g. after a git pull. A local copy that
#                 differs is kept next to it as SKILL.md.bak-<timestamp>.
#   sync.sh out   ~/.claude -> repo, e.g. after editing a task in the app
#
# Only tasks that already have a SKILL.md in ~/.claude/scheduled-tasks are
# touched. The app writes that file when the task is registered.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app="$HOME/.claude/scheduled-tasks"
mode="${1:-status}"

case "$mode" in
  status|in|out) ;;
  *) echo "usage: $0 [in|out]" >&2; exit 1 ;;
esac

for dir in "$repo"/*/; do
  id="$(basename "$dir")"
  ours="$repo/$id/SKILL.md"
  theirs="$app/$id/SKILL.md"
  if [ ! -f "$theirs" ]; then
    echo "skip  $id has no copy in $app"
    continue
  fi
  if cmp -s "$ours" "$theirs"; then
    echo "ok    $id"
    continue
  fi
  case "$mode" in
    status)
      echo "diff  $id"
      ;;
    in)
      cp -p "$theirs" "$theirs.bak-$(date +%s)"
      cp "$ours" "$theirs"
      echo "in    $id (old copy kept as SKILL.md.bak-*)"
      ;;
    out)
      cp "$theirs" "$ours"
      echo "out   $id"
      ;;
  esac
done
