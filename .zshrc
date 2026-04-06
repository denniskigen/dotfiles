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

# fnm configuration
export PATH="/Users/denniskigen/Library/Application Support/fnm:$PATH"
eval "$(fnm env --use-on-cd)"

# Tool configurations
export ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE="fg=cyan"

# Modern CLI alternatives
alias ll="eza -l -g --icons --git"
alias llt="eza -1 --icons --tree --git-ignore"
alias search="fzf --preview 'bat --color=always --style=numbers --line-range=:500 {}' | xargs nvim"


# Rebuild O3 from scratch with nightly images
o3-rebuild() {
  cd ~/Code/openmrs-distro-referenceapplication &&
  TAG=nightly docker compose up -d --pull always --force-recreate --wait
}

# Rebuild O3 from scratch with QA images
o3-rebuild-qa() {
  cd ~/Code/openmrs-distro-referenceapplication &&
  TAG=qa docker compose up -d --pull always --force-recreate --wait
}

# Sync distro config, tear down volumes, prune images, then rebuild from nightly
o3-sync-fresh() {
  cd ~/Code/openmrs-distro-referenceapplication || return 1

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Refusing to sync: working tree is not clean in openmrs-distro-referenceapplication."
    return 1
  fi

  local branch
  branch=$(git branch --show-current)
  if [[ "$branch" != "main" ]]; then
    echo "Refusing to sync: current branch is '$branch'. Switch to main first."
    return 1
  fi

  git fetch origin &&
  git pull --ff-only &&
  TAG=nightly docker compose down -v &&
  docker image prune -af &&
  TAG=nightly docker compose up -d --pull always --force-recreate --wait
}

# Sync distro config from origin/main, then refresh nightly images
o3-sync-rebuild() {
  cd ~/Code/openmrs-distro-referenceapplication || return 1

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Refusing to sync: working tree is not clean in openmrs-distro-referenceapplication."
    return 1
  fi

  local branch
  branch=$(git branch --show-current)
  if [[ "$branch" != "main" ]]; then
    echo "Refusing to sync: current branch is '$branch'. Switch to main first, or use o3-rebuild."
    return 1
  fi

  git fetch origin &&
  git pull --ff-only &&
  TAG=nightly docker compose up -d --pull always --force-recreate --wait
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
alias ybf="yarn build --force"
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
    printf "%-8s %6s  %s\n", pid, cpu, cmd
  }'
}
unalias respawn 2>/dev/null
respawn() {
  local branch
  branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  if [[ -z "$branch" ]]; then
    if git show-ref -q refs/remotes/origin/main; then branch=main
    elif git show-ref -q refs/remotes/origin/master; then branch=master
    else echo "Could not determine default branch" >&2; return 1
    fi
  fi
  git stash && git checkout "$branch" && git fetch origin && git reset --hard "origin/$branch"; [[ -f yarn.lock ]] && yarn
}
alias resp="respawn"
alias cres="clear && respawn && clear"
alias q="exit"
function killport() { lsof -i :$1 | awk 'NR!=1 {print $2}' | xargs kill -9; }
alias kn="killall node"

# OpenMRS-specific aliases
alias bump="yarn up openmrs@next @openmrs/esm-framework@next && gco package.json packages/esm-form-entry-app/package.json && yarn"
alias bump-rfe="yarn up @openmrs/esm-form-engine-lib@next && gco packages/esm-form-engine-app/package.json && yarn"
alias bump-afe="yarn up @openmrs/ngx-formentry@next && gco packages/esm-form-entry-app/package.json && yarn"
alias bump-common-lib="yarn up @openmrs/esm-patient-common-lib@next && gco package.json && yarn"
alias resolve-yarn="git checkout HEAD yarn.lock && yarn"
alias npxdev="npx openmrs develop --sources"
omrs-shell-local() {
  (cd ~/Code/openmrs-esm-core && OMRS_PROXY_TARGET="${1:-http://localhost}" yarn run run:shell)
}

