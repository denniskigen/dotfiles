# dennis does dotfiles

My dotfiles are how I personalize my system. Feel free to fork and change as you please.

## Claude Code config

`claude/` holds the parts of `~/.claude` worth carrying between machines: global
`CLAUDE.md`, `settings.json`, custom skills, and slash commands. `agents/` holds
the shared skills that `~/.agents` serves to other tools.

On a new machine:

```sh
git clone https://github.com/denniskigen/dotfiles ~/Code/dotfiles
~/Code/dotfiles/claude/install.sh
```

That symlinks everything into place. Claude Code writes through the symlinks, so
changing a setting in the app shows up as a diff here.

The `port-openmrs-form` skill shares its `assets`, `references`, and `scripts`
with the Codex copy of the same skill. The repo owns that content now, and
`install.sh` points `~/.codex/skills/port-openmrs-form` at it when that
directory exists, so editing it through either tool changes one copy.

What's deliberately not in the repo:

- `.mcp.json` has a live Jira token, so it's gitignored. `install.sh` seeds it
  from `.mcp.json.example` and you paste the token in.
- `port-openmrs-form/assets/` is an AMRS concept dictionary snapshot. It's org
  metadata and this repo is public, so copy it between machines by hand.
- `settings.local.json` is per-machine permission grants.
- `~/.claude.json` is machine ID, account state, and per-project history.
- Sessions, transcripts, caches, and telemetry.
