set tabstop=2
set number
set termguicolors

call plug#begin('~/.vim/plugged')
	Plug 'vim-airline/vim-airline'
	Plug 'vim-airline/vim-airline-themes'
	Plug 'svermeulen/vim-easyclip'
	Plug 'dracula/vim', {'as': 'dracula'}		
call plug#end()

syntax on
color dracula

set laststatus=2

let g:airline_powerline_fonts = 1

if !exists('g:airline_symbols')
	let g:airline_symbols = {}
endif
let g:airline_symbols.space = "\ua0"

let g:airline_theme='dracula'
"let g:lightline = { 'colorscheme': 'onedark' }
