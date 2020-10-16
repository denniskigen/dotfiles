# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

export NVM_DIR="$HOME/.nvm"
  [ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh"  # This loads nvm
  [ -s "/usr/local/opt/nvm/etc/bash_completion" ] && . "/usr/local/opt/nvm/etc/bash_completion"  
# This loads nvm bash_completion

# Path to your oh-my-zsh installation.
export ZSH="/Users/denniskigen/.oh-my-zsh"
eval "$(rbenv init -)"

# Change JAVA version in PATH
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8.0_265)
# Add Maven to PATH
export PATH=/opt/apache-maven/bin:$PATH 


# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/robbyrussell/oh-my-zsh/wiki/Themes
ZSH_THEME="robbyrussell"

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in ~/.oh-my-zsh/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment the following line to disable bi-weekly auto-update checks.
# DISABLE_AUTO_UPDATE="true"

# Uncomment the following line to automatically update without prompting.
# DISABLE_UPDATE_PROMPT="true"

# Uncomment the following line to change how often to auto-update (in days).
# export UPDATE_ZSH_DAYS=13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS=true

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
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
# Standard plugins can be found in ~/.oh-my-zsh/plugins/*
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git zsh-autosuggestions)

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

alias tlps="sudo tlp stat"
alias q="exit"
alias grep="grep --color=auto"
alias more="less"
alias mkdir="mkdir -p -v"
alias rmdir="rmdir -p -v"

alias hist="history | grep" # requires an argument
alias ..="cd .."

alias ls="ls -G"
alias lr="ls -R"				# recursive ls
alias ll="ls -l"
alias la="ls -A"
alias lx="ll -BX" 				# sort by extension
alias lz="ll -rS"				# sort by size
alias lt="ll -rt"				# sort by date
alias lm="la | more"

alias :q="exit"
alias :Q="exit"
alias :x="exit"
alias cd..="cd .."

alias nr="npm run"
alias nrs="nr start"
alias nrsh="nrs -- --https"
alias nrb="nr build"
alias nrt="nr test"

alias ydl="python3 /usr/local/bin/youtube-dl --no-check-certificate"
# alias yd="youtube-dl -f '(mp4) [height<1080]'"
alias ymp3="youtube-dl -x --embed-thumbnail --audio-format mp3" 
alias bbl="babel-repl"
alias ng2="cd ~/Code/Angular/Work/ng2-amrs && npm start"
alias ngdir="cd ~/Code/Angular/"
alias etl="cd ~/Code/Angular/Work/etl-rest-server"
alias formentry="cd ~/Code/Angular/Work/ngx-openmrs-formentry"
# youtube-dl -f "(mp4) [height<1080]" url
alias chromecors="open -a Google\ Chrome --args --disable-web-security --user-data-dir=''"
alias bravecors="open -n -a /Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --args --user-data-dir="/tmp/brave_dev_test" --disable-web-security/"
alias shuttle="sshuttle -r fmaiko@ssh.ampath.or.ke 0/0"
alias wmode="jest --config jest.config.json --verbose false --watch"
alias wmode2="jest --config jest.config.js --verbose false --watch"
alias bcl="bandcamp-dl"
alias gsu="git stash --include-untracked"
alias nrtc="npm run test -- --coverage"
alias nrtw="ng test --watch=true"
alias ni="npm install"
alias nisd="npm install --save-dev"
alias nrl="npm run lint"
alias nu="npm uninstall"
alias nrc="npm run coverage"
alias nrd="npm run dev"
alias yd="yarn dev"
alias ys="yarn start"
alias yb="yarn build"
alias yi="yarn install"
alias ya="yarn add"
alias yad="yarn add --dev"
alias yr="yarn remove"
alias gpom="git push -u origin master"
alias gpumr="git pull upstream master --rebase"
alias gpomr="git pull origin master --rebase"
alias gcpc="git cherry-pick --continue"
alias gcpa="git cherry-pick --abort"
alias npw="npx prettier --write"
alias cr="clear"
alias grhn="git reset HEAD~"
alias babel-node="./node_modules/.bin/babel-node"
alias flush-npm="rm -rf ./node-modules && rm ./package-lock.json && npm i"
alias npw="npx prettier --write"
alias npc="npx prettier --check ."
alias omrs="cd ~/Code/Work/openmrs"
alias yrsh="yarn run start --https"
alias work="cd ~/code/work"
alias gpo="git push origin"
alias gcnv="git commit -am 'WIP' --no-verify"
