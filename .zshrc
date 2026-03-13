# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Stop homebrew from running auto-update on every install
export HOMEBREW_NO_AUTO_UPDATE=1

# Set language environment
export LANG=en_US.UTF-8
export LC_CTYPE=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Theme configuration
ZSH_THEME="robbyrussell"

# Plugins configuration
plugins=(git z zsh-autosuggestions)

source $ZSH/oh-my-zsh.sh

# Node.js and development tools configuration

# pnpm configuration
export PNPM_HOME="/Users/denniskigen/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# Bun configuration
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
[ -s "/Users/denniskigen/.bun/_bun" ] && source "/Users/denniskigen/.bun/_bun"

# fnm configuration
export PATH="/Users/denniskigen/Library/Application Support/fnm:$PATH"
eval "$(fnm env --use-on-cd)"

# MySQL configuration
export PATH="/opt/homebrew/opt/mysql@5.7/bin:$PATH"

# Tool configurations
export ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE="fg=cyan"

# Load Angular CLI autocompletion
if command -v ng >/dev/null 2>&1; then
  eval "$(ng completion script 2>/dev/null)" 2>/dev/null || true
fi

# Modern CLI alternatives
alias ll="exa -l -g --icons --git"
alias llt="exa -1 --icons --tree --git-ignore"
alias search="fzf --preview 'bat --color=always --style=numbers --line-range=:500 {}' | xargs nvim"


# Rebuild O3 from scratch with nightly images
o3-rebuild() {
  cd ~/Code/OpenMRS/openmrs-distro-referenceapplication &&
  docker compose down -v &&
  TAG=nightly docker compose pull &&
  TAG=nightly docker compose build backend frontend &&
  TAG=nightly docker compose up -d
}

# Rebuild O3 from scratch with QA images
o3-rebuild-qa() {
  cd ~/Code/OpenMRS/openmrs-distro-referenceapplication &&
  docker compose down -v &&
  TAG=qa docker compose pull &&
  TAG=qa docker compose build backend frontend &&
  TAG=qa docker compose up -d
}

# Git aliases
unalias gpomr 2>/dev/null
gpomr() {
  local branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  if [[ -z "$branch" ]]; then
    if git show-ref -q refs/remotes/origin/main; then
      branch=main
    elif git show-ref -q refs/remotes/origin/master; then
      branch=master
    else
      echo "Could not determine default branch" >&2
      return 1
    fi
  fi
  git pull origin "$branch" --rebase
}
alias grim="git rebase -i main"
alias glo="git log --oneline"
alias gagc="ga . && gc"
alias gcan="git commit --amend --no-verify"
alias grc="git rebase --continue"
alias grm="git reset --merge"
alias fwl="git push --force-with-lease"
alias gsl="git stash list"
alias gsa="git stash apply"
alias gpc="gh pr checkout"
alias prev-branch="git checkout -"
alias copydiff="git diff HEAD | pbcopy"
alias copystageddiff="git diff --staged | pbcopy"
alias wip="git commit -m 'WIP' --no-verify"
alias delete-merged="git branch --merged | grep -Ev '(^\*|master|main|dev)' | xargs git branch -d"
alias grohm="git reset --hard origin/main"
alias gdiff='commits=$(git rev-list --count main...HEAD) && git diff HEAD~$commits HEAD | pbcopy'
alias gd='gdiff'
alias delete-prev-branch='git rev-parse --abbrev-ref @{-1} | grep -qE "^(main|master)$" && echo "Cannot delete main/master branch" || git branch -D @{-1}'
alias commits-over-main="git rev-list --count main...HEAD"
alias squash-to-main='count=$(git rev-list --count main...HEAD) && git reset --soft HEAD~$count && git commit'
alias gbr="git branch --sort=-committerdate | grep -v \"main\" | head -n 5"
alias gfiles="git diff-tree --no-commit-id --name-only -r HEAD"
alias gundo="git reset --soft HEAD^"
alias fetch-prune="git fetch --prune"
alias grecent="git reflog | grep 'checkout:' | sed 's/.*checkout: moving from .* to //' | awk '!seen[\$0]++' | head -5"
alias glg="git log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
alias gcane="git commit --amend --no-edit"
alias gss="git status -s"
alias prdiff="git --no-pager diff main...HEAD | pbcopy"
alias prdiff-no-lock="git --no-pager diff main...HEAD -- ':(exclude)yarn.lock' | pbcopy"

# Yarn aliases
alias yv="yarn verify"
alias yvf="yarn verify --force"
alias yrb="yarn build"
alias ybf="yarn build --force"
alias yrs="yarn start"
alias yrd="yarn dev"
alias yrsh="yarn run:shell"
alias yrsl="yarn start --backend=http://localhost"
alias yrt="yarn run test"
alias yrl="yarn run lint"
alias yb="yarn build"
alias yl="yarn lint"
alias yt="yarn test"
alias yteh="yarn test-e2e --headed --ui"
alias ys="yarn start"
alias yts="yarn typescript"
alias ytb="reset && yarn turbo build"
alias ytbl="yarn turbo build:lib"
alias ytt="reset && yarn turbo test"
alias yttf="reset && yarn turbo test --force"
alias yttw="reset && yarn turbo test:watch"
alias ytl="yarn turbo lint"
alias ytlf="yarn turbo lint --force"
alias ytty="yarn turbo typescript"
alias yss="yarn start --sources="
alias yrv="yarn verify"
alias yui="yarn upgrade-interactive"

# PNPM aliases
alias prd="pnpm dev"
alias prb="pnpm build"

# Utility aliases
# Show top 20 processes by CPU usage in a clean table
topcpu() {
  printf "%-8s %6s  %s\n" "PID" "CPU%" "COMMAND"
  printf "%s\n" "------------------------------------"
  ps aux -r | tail -n +2 | head -20 | awk '{
    pid=$2; cpu=$3;
    cmd=$11; gsub(/.*\//, "", cmd);  # Get basename
    # Clean up common app helper names
    if (cmd ~ /^Comet/) cmd="Comet "$12
    else if (cmd ~ /^Cursor/) cmd="Cursor "$12
    else if (cmd ~ /^Code/) cmd="Code "$12
    printf "%-8s %6s  %s\n", pid, cpu, cmd
  }'
}
alias respawn="git stash && gco main && grohm && gpomr && yarn"
alias resp="respawn"
alias cres="clear && respawn && clear"
alias q="exit"
function killport() { lsof -i :$1 | awk 'NR!=1 {print $2}' | xargs kill -9; }
alias kn="killall node"
alias code="cursor"

# OpenMRS-specific aliases
alias bump="yarn up openmrs@next @openmrs/esm-framework@next && gco package.json packages/esm-form-entry-app/package.json && yarn"
alias bump-rfe="yarn up @openmrs/esm-form-engine-lib@next && gco packages/esm-form-engine-app/package.json && yarn"
alias bump-afe="yarn up @openmrs/ngx-formentry@next && gco packages/esm-form-entry-app/package.json && yarn"
alias bump-common-lib="yarn up @openmrs/esm-patient-common-lib@next && gco package.json && yarn"
alias resolve-yarn="git checkout HEAD yarn.lock && yarn"
alias npxdev="npx openmrs develop --sources"
omrs-shell-local() {
  (cd ~/Code/OpenMRS/openmrs-esm-core && OMRS_PROXY_TARGET="${1:-http://localhost}" yarn run run:shell)
}

# Additional tool configurations
if [ -f "$HOME/fig-export/dotfiles/dotfile.zsh" ]; then
  source "$HOME/fig-export/dotfiles/dotfile.zsh"
fi


# Windsurf configuration
export PATH="/Users/denniskigen/.codeium/windsurf/bin:$PATH"

# Claude CLI alias


# Added by LM Studio CLI (lms)
export PATH="$PATH:/Users/denniskigen/.lmstudio/bin"
# End of LM Studio CLI section


# amp
export PATH="$HOME/.local/bin:$PATH"

#THIS MUST BE AT THE END OF THE FILE FOR SDKMAN TO WORK!!!
export SDKMAN_DIR="$HOME/.sdkman"
[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"

# Added by Antigravity
export PATH="/Users/denniskigen/.antigravity/antigravity/bin:$PATH"

# opencode
export PATH=/Users/denniskigen/.opencode/bin:$PATH
