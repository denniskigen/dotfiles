#!/usr/bin/env bash
# Prints what Greptile posted on a PR: its summary, inline findings, findings
# outside the diff, and its TREX test run.
#
# Usage: greptile.sh <owner/repo> <pr-number> [--wait]
#
# --wait polls until Greptile posts, which usually takes 2 to 7 minutes after
# the PR opens, and gives up after 15 minutes. A repo where Greptile has never
# commented on a PR is reported as inactive right away.
set -euo pipefail

repo="$1"
pr="$2"
bot='greptile-apps[bot]'

bot_items() {
  gh api --paginate "repos/$repo/$1" --jq ".[] | select(.user.login == \"$bot\")" | jq -s .
}

posted() {
  [ "$(bot_items "issues/$pr/comments")" != "[]" ] || [ "$(bot_items "pulls/$pr/reviews")" != "[]" ]
}

if ! posted; then
  seen="$(gh api -X GET search/issues -f q="repo:$repo is:pr commenter:app/greptile-apps" --jq .total_count)"
  if [ "$seen" = 0 ]; then
    echo "Greptile has never commented on a PR in $repo, so there's no review to wait for."
    exit 0
  fi
  if [ "${3:-}" = "--wait" ]; then
    for _ in $(seq 30); do
      sleep 30
      posted && break
    done
    # The summary, review and outside-diff comment land within seconds of each other.
    sleep 20
  fi
  if ! posted; then
    echo "Greptile hasn't posted on $repo#$pr yet."
    exit 1
  fi
fi

head="$(gh pr view "$pr" -R "$repo" --json headRefOid --jq .headRefOid)"
comments="$(bot_items "issues/$pr/comments")"
inline="$(gh api --paginate "repos/$repo/pulls/$pr/comments" --jq '.[]' | jq -s .)"

jq -rn --arg repo "$repo" --arg pr "$pr" --arg bot "$bot" --arg head "$head" \
  --argjson comments "$comments" --argjson inline "$inline" '
def clean:
  gsub("<!--[^>]*-->"; "")
  | gsub("<img[^>]*alt=\"(?<a>P[0-9])\"[^>]*>"; "[\(.a)]")
  | gsub("</?(a|img|picture|source|h[1-6]|details|summary|sub|br)\\b[^>]*>"; "")
  | gsub("&nbsp;"; " ") | gsub("&#39;"; [39] | implode) | gsub("&quot;"; "\"") | gsub("&amp;"; "&")
  | gsub("\\\\(?<c>[.,;:!()_*`-])"; "\(.c)")
  | gsub("\n[ \t]*\n(\\s*\n)+"; "\n\n")
  | sub("^\\s+"; "") | sub("\\s+$"; "");
def marked($m): [$comments[] | select(.body | contains("<!-- \($m)"))];

"== Greptile on \($repo)#\($pr) ==",
([$comments[] | select(.body | test("excluded authors"))][0] // null) as $skipped
| if $skipped then "\nSkipped: \($skipped.body | clean)" else
(marked("greptile_summary")[0] // null
  | if . == null then "\nNo summary comment."
    else
      (.body | capture("/commit/(?<sha>[0-9a-f]{40})").sha // "") as $sha
      | "\nSummary (confidence \(.body | capture("greptile_confidence_score:(?<s>[0-9])").s // "?")/5, last reviewed \($sha[:7])"
        + (if $sha == $head then ", the current head)" else "; head is now \($head[:7]))" end),
        (.body | clean)
    end),
([$inline[] | select(.user.login == $bot and .in_reply_to_id == null)] as $findings
  | "\nInline findings (\($findings | length)):",
    ($findings[] | . as $f
      | "\n- \(.path):\(.line // .original_line) (replies: \([$inline[] | select(.in_reply_to_id == $f.id)] | length)) \(.html_url)",
        (.body | clean | gsub("\n"; "\n  ") | "  " + .))),
(marked("greptile_outside_diff")[] | "\n\(.body | clean)"),
(marked("greptile_trex_summary")[0] // null
  | if . == null then "\nTREX: not posted yet." else "\n\(.body | clean)" end)
end
'
