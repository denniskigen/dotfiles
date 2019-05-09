set tabstop=2
set number
set termguicolors

call plug#begin('~/.vim/plugged')
	Plug 'vim-airline/vim-airline'
	Plug 'vim-airline/vim-airline-themes'
	Plug 'svermeulen/vim-easyclip'
	Plug 'leafgarland/typescript-vim'
	Plug 'dracula/vim', {'as': 'dracula'}
	Plug 'joshdick/onedark.vim'
	Plug 'sheerun/vim-polyglot'
	Plug 'tpope/vim-fugitive'
	Plug 'scrooloose/nerdtree'
	Plug 'junegunn/fzf'
	Plug 'altercation/vim-colors-solarized'
	Plug 'flazz/vim-colorschemes'
	Plug 'haishanh/night-owl.vim'
call plug#end()

syntax on
"color flattened_dark
"color night-owl
"syntax on
set background=dark
color gruvbox

set laststatus=2

let g:airline_powerline_fonts = 1

if !exists('g:airline_symbols')
	let g:airline_symbols = {}
endif
let g:airline_symbols.space = "\ua0"

"let g:airline_theme='dracula'
let g:airline_theme='onedark'
"let g:lightline = { 'colorscheme': 'onedark' }
