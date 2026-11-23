# Feature Specification: Browser Sudoku Game

**Feature Branch**: `001-sudoku-game`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "I want to create JS based sudoku game. The reference is https://www.websudoku.com - simple clean field. Allow multiple choice in one cell. 4 levels: easy, moderate, hard, evil. Can you analyze the website. What I'm not sure is if we need to have a predefined puzzles or generate a puzzle on opening the page. I think predefined is better, because we can make a competitions of the speed of puzzle id solutions."

## Reference Analysis (websudoku.com)

What the reference site does, as seen on its game, "Select a puzzle" and FAQ pages:

- **Four levels**: Easy, Medium, Hard, Evil. Difficulty reflects the depth of logic needed, not only the count of given digits.
- **Puzzle numbers**: every puzzle has a numeric ID (for example "Easy Puzzle 539,033,988"). A "Copy link for this puzzle" link and a "Select a puzzle" form (level + number, blank = random) let any player open the same puzzle.
- **Pencil marks**: an option. When on, several digits typed in one cell shrink to show up to 5 candidates. One candidate is shown smaller and in a different color than a confirmed digit.
- **Field**: a plain 9×9 grid with heavier lines around the 3×3 boxes. Given digits differ from player digits.
- **"How am I doing?"**: a check button that points out mistakes. The site shows no solutions.
- **Timer and stats**: solve times are tracked. A finished puzzle gets a percentile rank against other players. Puzzles that were paused, checked with mistakes, or picked by number are excluded from the rank.
- **Mobile**: an on-screen keypad for digit entry.

What this product takes from it: the clean field, the four levels, stable puzzle IDs, a shareable puzzle link, candidate marks, a check action and a timer. It does not copy the site's name, look or text.

### Puzzle source decision

Predefined puzzles with stable IDs are the chosen approach. Two players who open the same ID get the same grid. This makes a fair speed comparison possible. Each catalog puzzle is verified in advance to have exactly one solution and to match its level. A random puzzle on page open is still possible: the game picks a random ID from the catalog.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Solve a puzzle (Priority: P1)

A player opens the game, gets a puzzle of the default level, fills the empty cells, and sees a success message with the solve time when the grid is correct.

**Why this priority**: This is the core game. Without it there is no product.

**Independent Test**: Open the page, fill a known puzzle with its solution, and confirm the success message and the final time.

**Acceptance Scenarios**:

1. **Given** the page is opened with no puzzle in the address and no saved game exists, **When** it loads, **Then** a random Easy puzzle is shown with its level and ID, and the timer starts.
2. **Given** a puzzle is shown, **When** the player selects an empty cell and enters a digit 1–9, **Then** the digit appears in that cell in the "player digit" style.
3. **Given** a given (pre-filled) cell, **When** the player tries to change it, **Then** nothing changes.
4. **Given** all cells are filled correctly, **When** the last digit is entered, **Then** the timer stops and a message shows "solved" with the solve time and the puzzle ID.
5. **Given** a player digit in a cell, **When** the player clears the cell, **Then** the cell is empty again.

---

### User Story 2 - Candidate marks (multiple digits in one cell) (Priority: P1)

A player writes several possible digits into one cell to track candidates, then later replaces them with one final digit.

**Why this priority**: The user asked for it explicitly. Harder levels are not practical without it.

**Independent Test**: Put candidates 2, 5, 7 into one cell, confirm they show as small marks, then enter a final digit and confirm it replaces them.

**Acceptance Scenarios**:

1. **Given** candidate mode is on, **When** the player enters 2, 5 and 7 in one cell, **Then** the cell shows all three as small marks in fixed positions (1 at top-left … 9 at bottom-right).
2. **Given** a cell shows candidate 5, **When** the player enters 5 again in candidate mode, **Then** the 5 mark is removed.
3. **Given** a cell has candidates, **When** the player enters a final digit in normal mode, **Then** the final digit replaces all candidates in that cell.
4. **Given** a cell with candidates, **When** the grid is checked for completion, **Then** that cell counts as empty.
5. **Given** the player uses a keyboard, **When** the player holds a modifier key (or toggles the mode with one key) and types a digit, **Then** the digit goes in as a candidate.

---

### User Story 3 - Choose a level and a puzzle by ID (Priority: P1)

A player picks one of four levels for a random puzzle, or types a puzzle ID to open that exact puzzle. The player can copy a link to the current puzzle.

**Why this priority**: Stable IDs are the base for fair speed comparison, which is the main reason for predefined puzzles.

**Independent Test**: Open puzzle ID X on two different devices and confirm both show the same grid.

**Acceptance Scenarios**:

1. **Given** the level selector, **When** the player picks Easy, Moderate, Hard or Evil, **Then** a random puzzle of that level is shown.
2. **Given** a valid puzzle ID, **When** the player enters it or opens its link, **Then** that exact puzzle is shown with its level.
3. **Given** an ID that does not exist, **When** the player enters it, **Then** a clear message says the puzzle is not found and the current game is not lost.
4. **Given** a puzzle is shown, **When** the player uses "copy link", **Then** a link that opens the same puzzle is put on the clipboard.

---

### User Story 4 - Check progress (Priority: P2)

A player asks the game to check the current grid and sees which player digits are wrong.

**Why this priority**: Useful help, but the game works without it.

**Independent Test**: Enter one wrong digit, use "check", and confirm only that cell is marked.

**Acceptance Scenarios**:

1. **Given** the grid has wrong player digits, **When** the player uses "check", **Then** each wrong cell is marked and a short message gives the count.
2. **Given** all player digits are correct, **When** the player uses "check", **Then** a message says there are no mistakes so far.
3. **Given** "check" found mistakes in this game, **When** the puzzle is solved, **Then** the result is labelled "assisted".

---

### User Story 5 - Speed competition on one puzzle (Priority: P2)

Players solve the same puzzle ID and compare their solve times.

**Why this priority**: This is the reason for predefined puzzles, but it builds on stories 1 and 3.

**Independent Test**: Two players solve the same ID and compare their results. The comparison shows who was faster.

**Acceptance Scenarios**:

1. **Given** a solved puzzle, **When** the success message is shown, **Then** it shows the puzzle ID, level, solve time and the "clean" or "assisted" label.
2. **Given** a solved puzzle, **When** the player uses "share result", **Then** a short text with the puzzle link, ID, level and time is put on the clipboard.
3. **Given** the player solved the same ID before, **When** the player solves it again, **Then** the player's own best time for that ID is shown.
4. **Given** any solved puzzle, **When** the result is shown, **Then** no online leaderboard is involved: comparison happens only through shared links and copied results.

---

### User Story 6 - Keep progress after reload (Priority: P3)

A player closes or reloads the page and comes back to the same puzzle with the same digits, candidates and elapsed time.

**Why this priority**: Comfort feature. Not needed for the first playable version.

**Independent Test**: Enter digits and candidates, reload, and confirm all is restored.

**Acceptance Scenarios**:

1. **Given** a puzzle in progress, **When** the page is reloaded, **Then** the same puzzle, digits, candidates and elapsed time are restored.
2. **Given** a restored puzzle, **When** the player starts a new puzzle, **Then** the old progress is replaced.

---

### Edge Cases

- The player enters a digit that conflicts with a digit in the same row, column or box. The game accepts it and does not block it. A conflict highlight is shown by default; the player can turn it off (FR-006).
- The player enters 0, a letter or other characters. They are ignored.
- The page is hidden (other tab, phone locked). The timer pauses and starts again when the page is visible. A paused game is still valid for its own time.
- The player opens a link with a malformed ID. The game shows "puzzle not found" and offers a random puzzle.
- The player tries to undo many steps. Undo goes back step by step to the start state and no further.
- A cell has all nine candidates. All nine show and stay readable.
- The grid is full but wrong. The game does not show "solved". It shows that the grid is full and suggests "check".

## Requirements *(mandatory)*

### Functional Requirements

**Field and input**

- **FR-001**: The game MUST show a 9×9 grid with heavier lines around each 3×3 box, in a plain, clean style with no clutter around the field.
- **FR-002**: The game MUST show given digits in a different style from player digits, and MUST NOT let the player change given digits.
- **FR-003**: The player MUST be able to select a cell by click/tap and by arrow keys.
- **FR-004**: The player MUST be able to enter digits 1–9 and clear a cell by keyboard and by an on-screen keypad.
- **FR-005**: The game MUST highlight the selected cell, and lightly highlight its row, column and box. The selected cell MUST stay clearly marked (an outline, not only a background color) also when it shows a conflict or a Check mark.
- **FR-006**: The game MUST highlight duplicate digits in the same row, column or box. The player MUST be able to turn this off.
- **FR-007**: The game MUST provide undo and redo for all digit and candidate changes in the current game.

**Candidate marks**

- **FR-008**: The player MUST be able to put any set of digits 1–9 into one empty cell as candidate marks.
- **FR-009**: The game MUST show candidates as small digits in fixed positions inside the cell, smaller and in a different color than final digits. Candidate digits MUST be at least half the height of final digits, so that they stay easy to read.
- **FR-010**: The player MUST be able to switch between final-digit mode and candidate mode with one action (on-screen toggle and one keyboard key), and MUST be able to add a candidate with a modifier key without a mode switch.
- **FR-011**: Entering a final digit in a cell MUST remove all candidates in that cell.
- **FR-012**: A cell that holds only candidates MUST count as empty for completion.

**Levels and puzzles**

- **FR-013**: The game MUST offer four levels: Easy, Moderate, Hard, Evil.
- **FR-014**: The game MUST use a predefined catalog of puzzles. Each puzzle MUST have a stable, unique ID and a fixed level.
- **FR-015**: Each catalog puzzle MUST have exactly one solution, verified before it enters the catalog.
- **FR-016**: Each catalog puzzle MUST be placed in its level by the solving techniques it needs (harder levels need harder techniques), not only by the count of givens.
- **FR-017**: The catalog MUST hold at least 1,000 puzzles per level.
- **FR-018**: The same puzzle ID MUST always show the same grid to every player on every device.
- **FR-019**: The player MUST be able to open a random puzzle of a chosen level, and open a puzzle by its ID.
- **FR-020**: The current puzzle ID and level MUST be visible during play and MUST be part of the page address, so that the address opens the same puzzle.
- **FR-021**: The player MUST be able to copy a link to the current puzzle.
- **FR-022**: An unknown or malformed ID MUST give a clear "not found" message and MUST NOT destroy the current game.

**Timer, check and completion**

- **FR-023**: The game MUST show a timer that starts when the puzzle is shown and stops when it is solved.
- **FR-024**: The timer MUST pause when the page is hidden and when the player uses "pause". When the page is visible again, the timer resumes only if the pause came from hiding the page. While paused, the grid MUST be hidden.
- **FR-025**: The player MUST be able to check the grid. The check MUST mark each wrong player digit and MUST NOT show correct digits for empty cells.
- **FR-026**: The game MUST NOT offer a "show solution" action.
- **FR-027**: When all cells hold correct final digits, the game MUST stop the timer and show a success message with puzzle ID, level, solve time and the label "clean" (no mistakes found by check) or "assisted".
- **FR-028**: The player MUST be able to copy a short result text (puzzle link, ID, level, time, label) for sharing.
- **FR-029**: The game MUST store the player's best clean time per puzzle ID on the device and show it on completion.
- **FR-030**: The game MUST save the current game (puzzle, digits, candidates, elapsed time, undo history not required) on the device and restore it after reload.

**General**

- **FR-031**: The game MUST be playable on desktop and phone screens, from 320 px wide and up, without horizontal scroll.
- **FR-032**: The game MUST work without an account or login.
- **FR-033**: The game MUST work and look the same in current Chrome and current Safari, on desktop (macOS) and on phone (iOS Safari, Android Chrome).
- **FR-034**: The game MUST have a light theme and a dark theme. It MUST follow the device's light/dark setting by default, and the player MUST be able to choose one manually.
- **FR-035**: The light theme MUST use the "Soft modern" board: rounded outer frame, thin light lines between cells, dark lines around 3×3 boxes, a light tint on the selected cell's row, column and box, a stronger tint on cells with the same digit, and a red tint on conflicting cells. Reference: `design/board-styles.html`, style B.
- **FR-036**: The dark theme MUST use the "Dark tiles" board: each cell a separate rounded tile on a dark background, 3×3 boxes split by wider gaps instead of thick lines, player digits in a green accent, and an outline on cells with the same digit. Reference: `design/board-styles.html`, style D.

### Key Entities

- **Puzzle**: one catalog entry. Attributes: ID, level, the 81 cells of givens, the solution.
- **Level**: one of Easy, Moderate, Hard, Evil. Each puzzle belongs to exactly one level.
- **Game state**: the player's work on one puzzle. Attributes: puzzle ID, final digit per cell, candidate set per cell, elapsed time, status (playing, paused or solved), "check found mistakes" flag, undo/redo history.
- **Result**: a finished solve. Attributes: puzzle ID, level, solve time, clean/assisted label, date.
- **Personal best**: the lowest clean solve time per puzzle ID on this device.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new player starts to play within 3 seconds of the page open, with no instructions.
- **SC-002**: The same puzzle ID shows an identical grid on 100% of tested devices and browsers.
- **SC-003**: 100% of catalog puzzles have exactly one solution, and each level's puzzles match that level's technique rules.
- **SC-004**: A player can add or remove a candidate in one action (one key press or one tap after the mode is set).
- **SC-005**: Each digit entry shows on the grid with no delay the player can see (under 0.1 second).
- **SC-006**: The timer error is under 1 second for a 60-minute game, with pauses removed correctly.
- **SC-007**: After a reload, 100% of digits, candidates and elapsed time are restored.
- **SC-008**: In a test with 5 players, at least 4 complete an Easy puzzle and copy a shareable result without help.
- **SC-009**: All acceptance scenarios pass in both Chrome and Safari, with no visible difference in the board between the two browsers when compared side by side (small font-rendering differences between engines are allowed).

## Assumptions

- The level names are Easy, Moderate, Hard, Evil, as the user wrote ("moderade" is read as "Moderate"). The reference site uses "Medium" for the second level.
- The default level on first open is Easy.
- Puzzle IDs are numeric and cover all levels in one ID space, so an ID alone tells the level.
- The catalog is made in advance and ships with the game. No puzzle is generated on page open; "random" means a random ID from the catalog.
- Speed comparison in this version relies on shared puzzle links and copied results. Personal best times are kept on the device only. An online leaderboard is out of scope for this version.
- A result counts as "clean" only if no check found a mistake. Pauses do not change the label, because the timer already excludes paused time.
- No user accounts, no ads, no print feature and no puzzle variants (12×12, Samurai and others) in this version.
- The player's data stays on the player's device.
- "Current Chrome" and "current Safari" mean the latest stable version and the version before it. Firefox and other browsers are not tested in this version.
