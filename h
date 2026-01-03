
                   SSUUMMMMAARRYY OOFF LLEESSSS CCOOMMMMAANNDDSS

      Commands marked with * may be preceded by a number, _N.
      Notes in parentheses indicate the behavior if _N is given.
      A key preceded by a caret indicates the Ctrl key; thus ^K is ctrl-K.

  h  H                 Display this help.
  q  :q  Q  :Q  ZZ     Exit.
 ---------------------------------------------------------------------------

                           MMOOVVIINNGG

  e  ^E  j  ^N  CR  *  Forward  one line   (or _N lines).
  y  ^Y  k  ^K  ^P  *  Backward one line   (or _N lines).
  f  ^F  ^V  SPACE  *  Forward  one window (or _N lines).
  b  ^B  ESC-v      *  Backward one window (or _N lines).
  z                 *  Forward  one window (and set window to _N).
  w                 *  Backward one window (and set window to _N).
  ESC-SPACE         *  Forward  one window, but don't stop at end-of-file.
  d  ^D             *  Forward  one half-window (and set half-window to _N).
  u  ^U             *  Backward one half-window (and set half-window to _N).
  ESC-)  RightArrow *  Right one half screen width (or _N positions).
  ESC-(  LeftArrow  *  Left  one half screen width (or _N positions).
  ESC-}  ^RightArrow   Right to last column displayed.
  ESC-{  ^LeftArrow    Left  to first column.
  F                    Forward forever; like "tail -f".
  ESC-F                Like F but stop when search pattern is found.
  r  ^R  ^L            Repaint screen.
  R                    Repaint screen, discarding buffered input.
        ---------------------------------------------------
        Default "window" is the screen height.
        Default "half-window" is half of the screen height.
 ---------------------------------------------------------------------------

                          SSEEAARRCCHHIINNGG

  /_p_a_t_t_e_r_n          *  Search forward for (_N-th) matching line.
  ?_p_a_t_t_e_r_n          *  Search backward for (_N-th) matching line.
  n                 *  Repeat previous search (for _N-th occurrence).
  N                 *  Repeat previous search in reverse direction.
  ESC-n             *  Repeat previous search, spanning files.
  ESC-N             *  Repeat previous search, reverse dir. & spanning files.
  ESC-u                Undo (toggle) search highlighting.
  ESC-U                Clear search highlighting.
  &_p_a_t_t_e_r_n          *  Display only matching lines.
        ---------------------------------------------------
        A search pattern may begin with one or more of:
        ^N or !  Search for NON-matching lines.
        ^E or *  Search multiple files (pass thru END OF FILE).
        ^F or @  Start search at FIRST file (for /) or last file (for ?).
        ^K       Highlight matches, but don't move (KEEP position).
        ^R       Don't use REGULAR EXPRESSIONS.
        ^W       WRAP search if no match found.
 ---------------------------------------------------------------------------

                           JJUUMMPPIINNGG

  g  <  ESC-<       *  Go to first line in file (or line _N).
  G  >  ESC->       *  Go to last line in file (or line _N).
  p  %              *  Go to beginning of file (or _N percent into file).
  t                 *  Go to the (_N-th) next tag.
  T                 *  Go to the (_N-th) previous tag.
  {  (  [           *  Find close bracket } ) ].
  }  )  ]           *  Find open bracket { ( [.
  ESC-^F _<_c_1_> _<_c_2_>  *  Find close bracket _<_c_2_>.
  ESC-^B _<_c_1_> _<_c_2_>  *  Find open bracket _<_c_1_>.
        ---------------------------------------------------
        Each "find close bracket" command goes forward to the close bracket 
          matching the (_N-th) open bracket in the top line.
        Each "find open bracket" command goes backward to the open bracket 
          matching the (_N-th) close bracket in the bottom line.

  m_<_l_e_t_t_e_r_>            Mark the current top line with <letter>.
  M_<_l_e_t_t_e_r_>            Mark the current bottom line with <letter>.
  '_<_l_e_t_t_e_r_>            Go to a previously marked position.
  ''                   Go to the previous position.
  ^X^X                 Same as '.
  ESC-M_<_l_e_t_t_e_r_>        Clear a mark.
        ---------------------------------------------------
        A mark is any upper-case or lower-case letter.
        Certain marks are predefined:
             ^  means  beginning of the file
             $  means  end of the file
 ---------------------------------------------------------------------------

                        CCHHAANNGGIINNGG FFIILLEESS

  :e [_f_i_l_e]            Examine a new file.
  ^X^V                 Same as :e.
  :n                *  Examine the (_N-th) next file from the command line.
  :p                *  Examine the (_N-th) previous file from the command line.
  :x                *  Examine the first (or _N-th) file from the command line.
  :d                   Delete the current file from the command line list.
  =  ^G  :f            Print current file name.
 ---------------------------------------------------------------------------

                    MMIISSCCEELLLLAANNEEOOUUSS CCOOMMMMAANNDDSS

  -_<_f_l_a_g_>              Toggle a command line option [see OPTIONS below].
  --_<_n_a_m_e_>             Toggle a command line option, by name.
  __<_f_l_a_g_>              Display the setting of a command line option.
  ___<_n_a_m_e_>             Display the setting of an option, by name.
  +_c_m_d                 Execute the less cmd each time a new file is examined.

  !_c_o_m_m_a_n_d             Execute the shell command with $SHELL.
  |XX_c_o_m_m_a_n_d            Pipe file between current pos & mark XX to shell command.
  s _f_i_l_e               Save input to a file.
  v                    Edit the current file with $VISUAL or $EDITOR.
  V                    Print version number of "less".
 ---------------------------------------------------------------------------

                           OOPPTTIIOONNSS

        Most options may be changed either on the command line,
        or from within less by using the - or -- command.
        Options may be given in one of two forms: either a single
        character preceded by a -, or a name preceded by --.

  -?  ........  --help
                  Display help (from command line).
  -a  ........  --search-skip-screen
                  Search skips current screen.
  -A  ........  --SEARCH-SKIP-SCREEN
                  Search starts just after target line.
  -b [_N]  ....  --buffers=[_N]
                  Number of buffers.
  -B  ........  --auto-buffers
                  Don't automatically allocate buffers for pipes.
  -c  ........  --clear-screen
                  Repaint by clearing rather than scrolling.
  -d  ........  --dumb
                  Dumb terminal.
  -D xx_c_o_l_o_r  .  --color=xx_c_o_l_o_r
                  Set screen colors.
  -e  -E  ....  --quit-at-eof  --QUIT-AT-EOF
                  Quit at end of file.
  -f  ........  --force
                  Force open non-regular files.
  -F  ........  --quit-if-one-screen
                  Quit if entire file fits on first screen.
  -g  ........  --hilite-search
                  Highlight only last match for searches.
  -G  ........  --HILITE-SEARCH
                  Don't highlight any matches for searches.
  -h [_N]  ....  --max-back-scroll=[_N]
                  Backward scroll limit.
  -i  ........  --ignore-case
                  Ignore case in searches that do not contain uppercase.
  -I  ........  --IGNORE-CASE
                  Ignore case in all searches.
  -j [_N]  ....  --jump-target=[_N]
                  Screen position of target lines.
  -J  ........  --status-column
                  Display a status column at left edge of screen.
  -k [_f_i_l_e]  .  --lesskey-file=[_f_i_l_e]
                  Use a lesskey file.
  -K  ........  --quit-on-intr
                  Exit less in response to ctrl-C.
  -L  ........  --no-lessopen
                  Ignore the LESSOPEN environment variable.
  -m  -M  ....  --long-prompt  --LONG-PROMPT
                  Set prompt style.
  -n  -N  ....  --line-numbers  --LINE-NUMBERS
                  Don't use line numbers.
  -o [_f_i_l_e]  .  --log-file=[_f_i_l_e]
                  Copy to log file (standard input only).
  -O [_f_i_l_e]  .  --LOG-FILE=[_f_i_l_e]
                  Copy to log file (unconditionally overwrite).
  -p [_p_a_t_t_e_r_n]  --pattern=[_p_a_t_t_e_r_n]
                  Start at pattern (from command line).
  -P [_p_r_o_m_p_t]   --prompt=[_p_r_o_m_p_t]
                  Define new prompt.
  -q  -Q  ....  --quiet  --QUIET  --silent --SILENT
                  Quiet the terminal bell.
  -r  -R  ....  --raw-control-chars  --RAW-CONTROL-CHARS
                  Output "raw" control characters.
  -s  ........  --squeeze-blank-lines
                  Squeeze multiple blank lines.
  -S  ........  --chop-long-lines
                  Chop (truncate) long lines rather than wrapping.
  -t [_t_a_g]  ..  --tag=[_t_a_g]
                  Find a tag.
  -T [_t_a_g_s_f_i_l_e] --tag-file=[_t_a_g_s_f_i_l_e]
                  Use an alternate tags file.
  -u  -U  ....  --underline-special  --UNDERLINE-SPECIAL
                  Change handling of backspaces.
  -V  ........  --version
                  Display the version number of "less".
  -w  ........  --hilite-unread
                  Highlight first new line after forward-screen.
  -W  ........  --HILITE-UNREAD
                  Highlight first new line after any forward movement.
  -x [_N[,...]]  --tabs=[_N[,...]]
                  Set tab stops.
  -X  ........  --no-init
                  Don't use termcap init/deinit strings.
  -y [_N]  ....  --max-forw-scroll=[_N]
                  Forward scroll limit.
  -z [_N]  ....  --window=[_N]
                  Set size of window.
  -" [_c[_c]]  .  --quotes=[_c[_c]]
                  Set shell quote characters.
  -~  ........  --tilde
                  Don't display tildes after end of file.
  -# [_N]  ....  --shift=[_N]
                  Set horizontal scroll amount (0 = one half screen width).
                --file-size
                  Automatically determine the size of the input file.
                --follow-name
                  The F command changes files if the input file is renamed.
                --incsearch
                  Search file as each pattern character is typed in.
                --line-num-width=N
                  Set the width of the -N line number field to N characters.
                --mouse
                  Enable mouse input.
                --no-keypad
                  Don't send termcap keypad init/deinit strings.
                --no-histdups
                  Remove duplicates from command history.
                --rscroll=C
                  Set the character used to mark truncated lines.
                --save-marks
                  Retain marks across invocations of less.
                --status-col-width=N
                  Set the width of the -J status column to N characters.
                --use-backslash
                  Subsequent options use backslash as escape char.
                --use-color
                  Enables colored text.
                --wheel-lines=N
                  Each click of the mouse wheel moves N lines.


 ---------------------------------------------------------------------------

                          LLIINNEE EEDDIITTIINNGG

        These keys can be used to edit text being entered 
        on the "command line" at the bottom of the screen.

 RightArrow ..................... ESC-l ... Move cursor right one character.
 LeftArrow ...................... ESC-h ... Move cursor left one character.
 ctrl-RightArrow  ESC-RightArrow  ESC-w ... Move cursor right one word.
 ctrl-LeftArrow   ESC-LeftArrow   ESC-b ... Move cursor left one word.
 HOME ........................... ESC-0 ... Move cursor to start of line.
 END ............................ ESC-$ ... Move cursor to end of line.
 BACKSPACE ................................ Delete char to left of cursor.
 DELETE ......................... ESC-x ... Delete char under cursor.
 ctrl-BACKSPACE   ESC-BACKSPACE ........... Delete word to left of cursor.
 ctrl-DELETE .... ESC-DELETE .... ESC-X ... Delete word under cursor.
 ctrl-U ......... ESC (MS-DOS only) ....... Delete entire line.
 UpArrow ........................ ESC-k ... Retrieve previous command line.
 DownArrow ...................... ESC-j ... Retrieve next command line.
 TAB ...................................... Complete filename & cycle.
 SHIFT-TAB ...................... ESC-TAB   Complete filename & reverse cycle.
 ctrl-L ................................... Complete filename, list all.
[33m158bfad[m[33m ([m[1;36mHEAD -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m, [m[1;31morigin/HEAD[m[33m)[m Fix RESULTS spiral frame: border only, no inner fill
[33me681183[m Add blue-white spiral modem frame to RESULTS
[33m4ef6b27[m Fix RESULTS canvas to iPhone SE and add glowing frame
[33m7265393[m Add RESULTS overlay and button
[33mba6b622[m UI: dark readable info panel under avatar
[33m1ca9473[m fix: PA & ABOUT without nullish operator
[33m8be90d6[m Brighten avatar images on cards
[33m68e8632[m team badge x2 mobile
[33maf8d3bd[m Fix avatars path: use ../img/avatars (root) + keep team icons in results
[33meb04e14[m ROLL final v2
[33m4258c36[m ROLL final
[33m9aafdcd[m ROLL v6.1: fix status loader + correct img paths
[33mbac9e8d[m ROLL v6
[33mafcf83d[m ROLL v5: active card gold glow + button contrast
[33m0f7853c[m ROLL v4
[33m90ff737[m ROLL v3
[33m427ce0e[m ROLL v2
[33mca7818e[m ROLL mode, no header/footer, light carousel, only card-back + avatars
[33mff0a599[m Carousel ring + centered snap + fixed assets paths
[33mb956daf[m Carousel hero-style reveal (UA)
[33md2dc246[m Remove back card text (MBHA tap to flip)
[33meb34df4[m Fix cards CSS/JS paths
[33m7d0afc0[m fix: csv parse nullish operator error
[33m87ca33c[m SAPPER: fix syntax error (remove optional chaining)
[33me66b76f[m SAPPER: save real username from flappyScores via MBHA_CODE
[33mf91e8fc[m NYE mobile canon (iPhone SE) media cleanup
[33mc2d4979[m Fix NYE JS error + mobile SE tweaks
[33m9f86f5a[m NYE easter egg fixes (overlay image + layout)
[33m6a76780[m Update CSS values
[33m4b977e9[m chore: tweak mobile sprite scale via media queries
[33m1f2cd12[m fix: mobile sprite positioning
[33m69a20da[m wip: sprite positioning adjustments
[33m22628e2[m fix: hide comic modals by default (scene 2800fin)
[33m15c5eba[m fix: remove duplicate scene block and JS syntax error
[33md4da514[m Add scenes 3fin: comics, sprites, one-time triggers
[33m15c7f47[m Fix mobile layout: sapper board positioned correctly
[33m32f364e[m feat: add sapper launch button, top-3 block and assets
[33m6b6b796[m feat(sapper): add Firebase top-3 like flappy and save best score
[33m66c85d4[m feat: working sapper board with numbers and flood open
[33m82f87a3[m fix scene-02 comic modal overlay position
[33m31e3210[m add scene-02 comic, animations and total 1.1M logic
[33m3302475[m remove terminal, set main as index
[33m8cd497e[m add CONNECTING... SUCCESSFUL before system check
[33mf9174a1[m use custom modem audio + connecting animation
[33m9cc8ff1[m add web audio sounds to ms-dos terminal
[33mec512ed[m split terminal page js into separate file
[33md51fedd[m fix terminal page
[33mbac22fb[m fix invalid token crash
[33m9b3d438[m fix broken script quotes
[33mf881aad[m clean red ms-dos gate 7-7-7
[33m32a304d[m fix ms-dos access js and set codes 7-7-7
[33m65c9d45[m set access codes to 7-7-7
[33m7d88c86[m add ms-dos access gate with firebase
[33mac5fe50[m add main.html backup for ms-dos access
[33mffe77bc[m Add Safari browser notice to code modal
[33mfc1e73f[m Add 400k scene and one-time comic trigger
[33md9f0d01[m fix: mobile position fin
[33m46130f4[m fix: mobile position2
[33m883a0d5[m fix: mobile position1
[33m410e617[m fix: mobile position
[33m94ca7bc[m fix: adjust intro start button mobile position
[33m7a06b9a[m Final mobile alignment for intro avatar and START button
[33mf0bc1e0[m Fine-tune intro START GAME button positioning
[33md837432[m Final adjust START GAME button for desktop and mobile
[33m159774b[m Move START GAME button 5% to the right
[33md2a0add[m Refine START GAME button: static frame + softer pulsing text
[33ma31048c[m Adjust intro avatar and start button positioning + animate text only
[33m80ffa3b[m Fix intro start button and rules opening
[33mcb17bf8[m Add intro comics modal styles
[33m4483386[m Fix intro comics image formats
[33m8428d56[m Add full intro comics modal with navigation and start flow
[33mb38f58b[m Tune HA scene spacing and user section layout
[33m21a8edb[m MBHA: fix Kevin & bandits layout + iPhone SE scaling
[33m8f3d7c1[m Fix mobile positions and scale for MBHA characters
[33m1a5c648[m Update user photo
[33mcc6d001[m Temporarily disable site lock for testing descriptions
[33ma26ab30[m Add site lock stub for all users except CD34
[33mc399ffe[m Fix CSV parser to correctly handle ABOUT with commas and MODAL_VER
[33m666f3c6[m Fix team intro modal close button and layout
[33me4ded41[m Fix mobile onboarding text overflow + close button after choice
[33m96faf79[m MBHA: team intro modal with MODAL_VER flags
[33mde39fd1[m Update rules text with custom scroll
[33mbccca72[m update fonts and TOTAL display
[33m08d17df[m update MBHA fonts and TOTAL from sheet
[33me578cc7[m Fix TOTAL: get values directly from Google Sheets + font prep
[33m37a94f9[m fix total calc from sheets
[33m3074cb2[m fix: MBHA main.js total + logout
[33m1b3afbb[m Logout: force page reload after sign out
[33m1ab7300[m Update TOTAL font to Jersey 25
[33mc3b3f71[m Fix TOTAL calculation (Kevin + Bandits)
[33m7e3cc2c[m Fix TOTAL calculation (Kevin + Bandits only)
[33m46c9a1e[m Add pixel logout button without glow
[33m25b7703[m UI: resize & redesign logout power button
[33mcf1a39c[m MBHA: daily auth, logout button and Firebase flappy scores on main
[33m08fb174[m Add daily auth + logout button for MBHA
[33m5ecd0e7[m Fix flappy paths & Firebase sync on main
[33m50f5127[m Fix flappy.js path in flappy.html
[33m94e20a8[m Fix flappy.js
[33m7c9acf1[m Fix flappy.js path and Firebase integration
[33m5b5647e[m Add Firebase score saving for Flappy game
[33mee8e4c0[m FLAPPY: фикс JSON doPost + новое API сохранения рекордов
[33mb5afcf6[m Update Flappy API URL  новая рабочая версия
[33m0d4a965[m FLAPPY CAKE: фикс drawGround и логирование отправки рекордов
[33md72a44f[m Fix GitHub Pages 404: add redirect index for Flappy
[33m2bb9862[m FLAPPY CAKE: фиксы записи рекордов и логики юзера
[33mca5865d[m Fix FlappyCake score saving via localStorage auth
[33m3e38f4f[m Connect Flappy Cake scores with MBHA auth and leaderboard
[33mdb2c03a[m Обновил авторизацию и рекорды Flappy Cake
[33m314ab22[m Fix flappy link  flappy/flappy.html
[33md53222b[m Добавил иконку FLAPPY CAKE вместо кнопки GAME + стили
[33m9f74564[m UI: объемная GAME, неоновый personal account и FLAPPY CAKE
[33mf9757af[m Add close button to Flappy Cake + styles
[33m2bd7e9f[m Fix: правильный путь к игре FLAPPY CAKE
[33me7b7ce4[m Добавил Flappy Cake внутрь сайта
[33m826ccc5[m MBHA: добавлены FLAPPY CAKE, TOP-3, кнопка GAME и интеграция рекордов
[33me1686fe[m Update avatars to PNG format
[33m77a4802[m Fix: login flow restored, DONT PUSH overlay added, code cleaned
[33mfca84e4[m Fix: center rules button + add new avatars
[33m61b7722[m Add Pac-Man arcade + new layout
[33m37d76f2[m add MBHA arcade game with sounds and UA rules
[33m00128c7[m Update rules modal and add 3D DONT PUSH button
[33mc21f655[m Add DONT PUSH button with user/guest sounds
[33m95a0c36[m Update avatars and main.js logic
[33mf9e0e97[m Restore full main.js functionality (login modal, rules, music, avatars)
[33mdfa11c2[m Fix avatar logic and fallback, update main.js
[33mfe53a36[m Update code modal text and error message
[33m3a3dce2[m mobile: moved speaker icon 2% left
[33mc93168c[m mobile tweak: moved speaker icon (right +2%, down +1%)
[33ma5f0796[m mobile safari fix: moved speaker icon + total block order
[33m2d9e150[m Add purple glow hover for rules icon + adjust music icon position
[33m411a246[m update music button position, fix modal layout, adjust styles
[33mc8614c3[m garland top position fix
[33mc0be943[m update
[33m23569d0[m mobile fix garlands
[33m859d0bd[m mobile layout fix: header, garlands, user row
[33m5b0c3fc[m mobile spacing fix
[33me8bc50a[m update
[33m96b59a7[m layout & font update
[33mc5bab54[m raise top garland
[33mcacef25[m update
[33m322d274[m remove label and bottom bar
[33mae60105[m mobile stars & garlands tweak
[33m129daaf[m mobile lamps size update
[33m1095869[m mobile update
[33m27102b8[m обновление проекта
[33m5086c7e[m Initial commit
