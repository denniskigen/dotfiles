# dennis does dotfiles

My dotfiles are how I personalize my system. Feel free to fork and change as you please.

## Claude Code config

`claude/` holds the parts of `~/.claude` worth carrying between machines: global
`CLAUDE.md`, `settings.json`, custom skills, slash commands, and the `mcp.json`
that lands at `~/.mcp.json`. `agents/` holds the shared skills that `~/.agents`
serves to other tools.

On a new machine:

```sh
git clone https://github.com/denniskigen/dotfiles ~/Code/dotfiles
~/Code/dotfiles/claude/install.sh
```

That symlinks everything into place. Claude Code writes through the symlinks, so
changing a setting in the app shows up as a diff here.

One exception: `claude mcp add` refuses to write through a symlink and says so
rather than failing quietly. Edit `claude/mcp.json` here instead. MCP servers
get their own credentials, the jira one from `~/Code/jira-mcp/.env`, so no
token belongs in `mcp.json`.

The `port-openmrs-form` skill shares its `assets`, `references`, and `scripts`
with the Codex copy of the same skill. The repo owns that content now, and
`install.sh` points `~/.codex/skills/port-openmrs-form` at it when that
directory exists, so editing it through either tool changes one copy.

### Scheduled tasks

`claude/scheduled-tasks/` holds the prompts for my scheduled tasks in the Claude
app, and `claude/community-watch/` and `claude/squad-agenda/` hold the scripts
they call. The scripts are symlinked like everything else. The prompts aren't,
because the app won't read a task's `SKILL.md` through a symlink, so
`claude/scheduled-tasks/sync.sh` copies them. Run `sync.sh out` after editing a
task in the app and `sync.sh in` after pulling. `install.sh` runs `sync.sh in`.

The app keeps the schedules per machine, so a new machine needs the tasks
registered once. Pull, then ask Claude in `~/Code`:

> Register the scheduled tasks in
> ~/Code/dotfiles/claude/scheduled-tasks/schedules.json. For each one, use its
> ID, title and cron, the description from its SKILL.md frontmatter, and the
> rest of the SKILL.md as the prompt. Then pause all of them.

Then run `install.sh` so the prompts match the repo.

I keep them running on one Mac at a time. If both run them, I get duplicate
drafts and digests, and a Mac that was closed catches up on missed runs when it
opens. When I switch, I ask Claude to pause them on the old Mac and resume them
on the new one.

`squad-call-notes` reads the call transcript from Wispr Flow's local database,
so it only finds the call on the Mac that recorded it.

What's deliberately not in the repo:

- Anything holding a credential. MCP servers read their own `.env` files.
- `port-openmrs-form/assets/` is an AMRS concept dictionary snapshot. It's org
  metadata and this repo is public, so copy it between machines by hand.
- `settings.local.json` is per-machine permission grants.
- `~/.claude.json` is machine ID, account state, and per-project history.
- What the scheduled tasks write: digests, review drafts, call transcripts and
  notes, and the Talk scan's `state.json`. Each machine keeps its own.
- Sessions, transcripts, caches, and telemetry.
