#!/usr/bin/env bash
# Link Claude Code config from this repo into ~/.claude and ~/.agents.
# Safe to re-run: existing regular files are backed up, existing correct
# symlinks are left alone.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

link() {
  local src="$1" dest="$2"
  if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$src" ]; then
    echo "ok    $dest"
    return
  fi
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    mv "$dest" "$dest.bak-$(date +%s)"
    echo "moved $dest aside"
  fi
  ln -s "$src" "$dest"
  echo "link  $dest -> $src"
}

mkdir -p ~/.claude

for f in CLAUDE.md settings.json skills commands; do
  link "$repo/claude/$f" "$HOME/.claude/$f"
done

link "$repo/agents" "$HOME/.agents"

# port-openmrs-form's content is shared with Codex. Point Codex at the same
# copy so the two never drift.
codex_skill="$HOME/.codex/skills/port-openmrs-form"
if [ -d "$codex_skill" ]; then
  for d in assets references scripts; do
    src="$repo/claude/skills/port-openmrs-form/$d"
    # assets holds the AMRS snapshot, which is gitignored, so it is absent on a
    # fresh clone. Linking it anyway would leave a dead symlink.
    if [ -e "$src" ]; then
      link "$src" "$codex_skill/$d"
    else
      echo "skip  $d not in the repo"
    fi
  done
else
  echo "skip  $codex_skill not present, leaving Codex alone"
fi

if [ ! -e ~/.claude/.mcp.json ]; then
  cp "$repo/claude/.mcp.json.example" ~/.claude/.mcp.json
  echo
  echo "Created ~/.claude/.mcp.json from the example."
  echo "Paste your Jira API token into it - it is deliberately not in git."
fi

cat <<'EOF'

Plugins are not linked (their cache holds absolute paths). To match this
machine, run in a Claude Code session:

  /plugin marketplace add anthropics/claude-plugins-official
  /plugin install frontend-design@claude-plugins-official
  /plugin install swift-lsp@claude-plugins-official
  /plugin install vercel@claude-plugins-official

settings.json already records them as disabled; enable what you want there.
EOF
