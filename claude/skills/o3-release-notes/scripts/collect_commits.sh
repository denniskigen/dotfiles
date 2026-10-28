#!/bin/bash
# Lists the commits in each repo's release range, for the contributor ledger.
#
#   collect_commits.sh ranges.tsv > commits.tsv
#
# ranges.tsv has one "repo<TAB>from-tag<TAB>to-tag" line per repo under github.com/openmrs.
# Use "-" as from-tag for a module that is new in this release, to take its whole history up to to-tag.
# Tag names aren't uniform across repos (v1.2.3, 1.2.3, queue-3.0.0, authentication-2.3.0), so check
# each one with `gh api repos/openmrs/<repo>/tags --jq '.[].name'`.
#
# Output: repo<TAB>sha<TAB>login<TAB>subject<TAB>parent-count. Commits without a linked GitHub
# account show "?" plus the git author name. A range that fails (usually a wrong tag name) is reported
# on stderr as "ERR", left out of the output, and makes the script exit 1.
set -uo pipefail

ranges=${1:?usage: collect_commits.sh ranges.tsv}
fields='[$repo, .sha[0:8], (.author.login // ("?" + .commit.author.name)), (.commit.message | split("\n")[0]), (.parents | length)] | @tsv'
status=0

while IFS=$'\t' read -r repo from to; do
  jq_fields=$(echo "$fields" | sed "s/\$repo/\"$repo\"/")
  if [ "$from" = "-" ]; then
    out=$(gh api --paginate "repos/openmrs/$repo/commits?sha=$to&per_page=100" --jq ".[] | $jq_fields")
  else
    out=$(gh api --paginate "repos/openmrs/$repo/compare/$from...$to?per_page=100" --jq ".commits[] | $jq_fields")
  fi
  if [ $? -ne 0 ]; then
    echo "ERR $repo ${from}...${to}" >&2
    status=1
  elif [ -n "$out" ]; then
    printf '%s\n' "$out"
  fi
done < <(grep -v '^\s*\(#\|$\)' "$ranges")

exit $status
