#!/usr/bin/env bash
# Blocks `gh pr create` in OpenMRS repos until the branch HEAD has been
# self-reviewed with o3-pr-review.
#
# As a PreToolUse hook on Bash (no args), it reads the hook payload on stdin and
# exits 2, which blocks the call, when the command opens a PR from an OpenMRS
# repo whose HEAD isn't recorded as reviewed. Any other failure exits non-2, so
# the hook fails open.
#
# `self-review-gate.sh --mark [dir]` records the HEAD of the repo at dir
# (default: the current directory) as reviewed.
set -euo pipefail

# Reviewed SHAs live in the common git dir so every worktree of a repo shares them.
marker_file() {
  echo "$(git -C "$1" rev-parse --path-format=absolute --git-common-dir)/o3-self-reviewed"
}

if [ "${1:-}" = "--mark" ]; then
  dir="${2:-.}"
  git -C "$dir" rev-parse HEAD >> "$(marker_file "$dir")"
  echo "Recorded $(git -C "$dir" rev-parse --short HEAD) as self-reviewed."
  exit 0
fi

payload="$(cat)"
cmd="$(jq -r '.tool_input.command // empty' <<<"$payload")"
grep -Eq '(^|[;&|(])[[:space:]]*gh[[:space:]]+pr[[:space:]]+create([[:space:]]|$)' <<<"$cmd" || exit 0

# The Bash tool resets its working directory between calls, so a command aimed
# at another repo usually starts with `cd <repo> &&`.
dir="$(jq -r '.cwd // empty' <<<"$payload")"
cd_re='^[[:space:]]*cd[[:space:]]+([^[:space:];&|]+)[[:space:]]*&&'
if [[ $cmd =~ $cd_re ]]; then
  target="${BASH_REMATCH[1]}"
  target="${target//\"/}"
  target="${target//\'/}"
  target="${target/#\~/$HOME}"
  case "$target" in
    /*) dir="$target" ;;
    *) dir="$dir/$target" ;;
  esac
fi

git -C "$dir" rev-parse --git-dir >/dev/null 2>&1 || exit 0
remotes="$(git -C "$dir" remote -v)"
grep -qi 'openmrs' <<<"$remotes" || exit 0

head="$(git -C "$dir" rev-parse HEAD)"
marker="$(marker_file "$dir")"
if [ -f "$marker" ] && grep -qx "$head" "$marker"; then
  exit 0
fi

cat >&2 <<EOF
Blocked: HEAD $(git -C "$dir" rev-parse --short HEAD) in $dir hasn't been self-reviewed.
Before opening a PR on an OpenMRS repo, review the branch with the o3-pr-review skill in Pre-PR Self-Review Mode and share the findings with the user. Once the review is clean, or the user has decided on every finding, record it in its own command, then retry:
  cd $dir && ~/.claude/skills/o3-pr-create/scripts/self-review-gate.sh --mark
Only the user can waive the review.
EOF
exit 2
