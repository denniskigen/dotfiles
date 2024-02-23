# Fig pre block. Keep at the top of this file.
[[ -f "$HOME/.fig/shell/zshrc.pre.zsh" ]] && builtin source "$HOME/.fig/shell/zshrc.pre.zsh"
# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Stop homebrew from running auto-update on every install
export HOMEBREW_NO_AUTO_UPDATE=1

# Increase memory limit for Node.js
#export NODE_OPTIONS=--max-old-space-size=8192


# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="robbyrussell"

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git z zsh-autosuggestions)

source $ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"
alias yv="yarn verify"
alias yvf="yarn verify --force"
alias yrb="yarn build"
alias ybf="yarn build --force"
alias yrs="yarn start"
alias yrd="yarn dev"
alias yrsh="yarn run:shell"
alias yrt="yarn run test"
alias yrl="yarn run lint"
alias yb="yarn build"
alias yl="yarn lint"
alias yt="yarn test"
alias ys="yarn start"
alias yts="yarn typescript"
alias ytb="yarn turbo build"
alias ytbl="yarn turbo build:lib"
alias ytt="yarn turbo test"
alias yttf="ytt --force"
alias yttw="yarn turbo test:watch"
alias ytl="yarn turbo lint"
alias ytlf="yarn turbo lint --force"
alias ytty="yarn turbo typescript"
alias yss="yarn start --sources="
alias yrv="yarn verify"
alias yui="yarn upgrade-interactive"
alias gpomr="git pull origin main --rebase"
alias glo="git log --oneline"
alias gcan="git commit --amend --no-verify"
alias grc="git rebase --continue"
alias grm="git reset --merge"
alias respawn="gco main && gpomr && yarn"
alias resp="respawn"
alias cres="clear && respawn && clear"
alias q="exit"
alias npxdev="npx openmrs develop --sources"
alias gpfwl="git push --force-with-lease"
alias killport='function _killport(){ lsof -i :$1 | awk '\''NR!=1 {print $2}'\'' | xargs kill -9; };_killport'
alias gsl="git stash list"
alias gsa="git stash apply"
alias yteh="yarn test-e2e --headed"
alias prd="pnpm dev"
alias prb="pnpm build"
alias gpc="gh pr checkout"
alias gdhh="git diff HEAD HEAD~1"
alias wip="git commit -m 'WIP' --no-verify"

export NODE_OPTIONS=openssl-legacy-provider

# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
# [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# pnpm
export PNPM_HOME="/Users/denniskigen/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

export LC_CTYPE=en_US.UTF-8
export LC_ALL=en_US.UTF-8

source /Users/denniskigen/.docker/init-zsh.sh || true # Added by Docker Desktop

export PATH="$PATH:$HOME/.local/bin"

# Load Angular CLI autocompletion.
# source <(ng completion script)

# bun completions
[ -s "/Users/denniskigen/.bun/_bun" ] && source "/Users/denniskigen/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

alias ll="exa -l -g --icons --git"
alias llt="exa -1 --icons --tree --git-ignore"
alias search="fzf --preview 'bat --color=always --style=numbers --line-range=:500 {}' | xargs nvim"
export PATH="/opt/homebrew/opt/mysql@5.7/bin:$PATH"

alias mvn='JAVA_HOME="$(/usr/libexec/java_home -v 1.8)" mvn'

# export PATH="/Library/Java/JavaVirtualMachines/temurin-11.jdk/Contents/Home/bin/:$PATH"

# fnm
export PATH="/Users/denniskigen/Library/Application Support/fnm:$PATH"
eval "`fnm env`"

# Fig post block. Keep at the bottom of this file.
[[ -f "$HOME/.fig/shell/zshrc.post.zsh" ]] && builtin source "$HOME/.fig/shell/zshrc.post.zsh"
