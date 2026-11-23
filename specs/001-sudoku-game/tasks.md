---

description: "Task list for the Browser Sudoku Game"
---

# Tasks: Browser Sudoku Game

**Input**: Design documents from `specs/001-sudoku-game/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The plan (research R12) defines Vitest unit and catalog
tests and Playwright e2e tests in `chromium` and `webkit`; SC-002, SC-003 and
SC-009 can only be verified by them. Write each story's tests first and make
sure they fail before the implementation.

**Organization**: Tasks are grouped by user story (spec.md US1–US6).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)

## Path Conventions

Static web app per plan.md: game in `web/`, pure logic in `web/js/core/`,
offline tool in `tools/`, tests in `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Create the directory layout from plan.md "Source Code" (`web/css`, `web/js/core`, `web/js/ui`, `web/puzzles`, `tools`, `tests/unit`, `tests/catalog`, `tests/e2e`)
- [X] T002 Create `package.json` with `"type": "module"`, `engines.node >=26`, dev deps `vitest@5.1.1` and `@playwright/test@1.65.1`, and scripts `start` (static server for `web/` on port 8080), `test`, `test:catalog`, `test:e2e`, `catalog` per quickstart.md
- [X] T003 [P] Create `playwright.config.js` with `webServer` running `npm start`, `baseURL` `http://localhost:8080`, and projects `chromium`, `webkit`, `mobile-safari` (`iPhone 15`), `mobile-chrome` (`Pixel 8`) per research R12
- [X] T004 [P] Create `vitest.config.js` with test roots `tests/unit` and `tests/catalog` (node environment)
- [X] T005 [P] Create `web/index.html` skeleton: `<meta name="viewport">`, `<meta name="color-scheme" content="light dark">`, links to `css/base.css`, `css/theme-light.css`, `css/theme-dark.css`, empty regions for header, board, keypad and dialogs, and `<script type="module" src="js/main.js">`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Grid logic, solver, grader, ID scheme, catalog and storage codec. Every story needs a loadable puzzle.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation

- [X] T006 [P] Unit tests for grid helpers (index↔row/col/box, 20 peers per cell, conflict detection) in `tests/unit/grid.test.js`
- [X] T007 [P] Unit tests for the solver (solves a known puzzle; `countSolutions(grid, 2)` returns 0, 1 or 2 correctly; < 5 ms on an Evil sample) in `tests/unit/solver.test.js`
- [X] T008 [P] Unit tests for each technique in research R3 (one crafted candidate state per technique that checks the removed and the kept candidates; simple coloring covers trap and wrap), a soundness test over catalog samples of levels 2–4, and grader ladder tests in `tests/unit/grader.test.js`
- [X] T009 [P] Unit tests for ID parse/format per `contracts/catalog.md` "ID mapping" (valid IDs, separators and spaces stripped, `^[1-4][0-9]{5}$`, out-of-range position) in `tests/unit/catalog.test.js`
- [X] T010 [P] Unit tests for the storage codec per `contracts/storage.md` (versioned read/write, bad JSON and unknown `v` delete the key, write failure does not throw) in `tests/unit/storage.test.js`

### Implementation for Foundation

- [X] T011 [P] Implement grid helpers (cell index rules from data-model.md intro, peers, `findConflicts(values)`) in `web/js/core/grid.js`
- [X] T012 Implement the backtracking solver with `solve(givens)` and `countSolutions(givens, limit)` in `web/js/core/solver.js` (uses grid.js; produces data-model.md `Puzzle.solution`)
- [X] T013 Implement candidate-based techniques from research R3 (naked/hidden single, locked candidates, naked/hidden pair/triple/quad, X-Wing, Swordfish, XY-Wing, XYZ-Wing, simple coloring) in `web/js/core/techniques.js`
- [X] T014 Implement the grader (apply techniques easiest first, return the hardest technique used and the level per research R3, or `null` if unsolved) in `web/js/core/grader.js`
- [X] T015 [P] Implement ID parse/format and level-file lookup (lazy `fetch` of `puzzles/level-N.json`, cache per level, random ID per level) in `web/js/core/catalog.js` (data-model.md `Puzzle.id`, `Puzzle.level`, `Puzzle.givens`)
- [X] T016 [P] Implement the safe versioned storage codec (`read(key)`, `write(key, value)`, `remove(key)`) in `web/js/storage.js` per `contracts/storage.md`
- [X] T017 Implement the catalog tool in `tools/catalog.js`: generate a full grid, remove givens while `countSolutions == 1`, grade, keep only puzzles whose grade and givens count match the requested level (research R3), reject duplicates incl. rotations/reflections/digit relabelling, and append to `web/puzzles/level-N.json`; CLI `--level N --count K`
- [X] T018 Catalog tests in `tests/catalog/catalog.test.js` for all six guarantees in `contracts/catalog.md` (append-only check compares each file with its copy at the latest `release-*` git tag, or at `main` if no tag exists, via `git show`; skipped when the baseline has no such file)
- [X] T019 Run `npm run catalog` for levels 1–4 until each `web/puzzles/level-N.json` has ≥ 1,000 entries (FR-017), then run `npm run test:catalog`; record the run time per level in the commit message

**Checkpoint**: `npm test` and `npm run test:catalog` pass; four catalog files exist.

---

## Phase 3: User Story 1 - Solve a puzzle (Priority: P1) 🎯 MVP

**Goal**: Open the page, get a random Easy puzzle, fill values, see "solved" with the time.

**Independent Test**: Open `/`, fill puzzle `100001` with its solution, see the success message with time and ID.

### Tests for User Story 1

- [X] T020 [P] [US1] Unit tests for game state: givens immutable, set/clear value, undo/redo one move per action, conflict list, `solved` transition, input ignored after `solved` in `tests/unit/game.test.js`
- [X] T021 [P] [US1] Unit tests for the timer and pause rules: sums active intervals, pause/resume, hidden time not counted, page visible does not resume a `user` pause, `m:ss` and `h:mm:ss` format in `tests/unit/timer.test.js`
- [X] T022 [P] [US1] E2E test of spec US1 scenarios 1–5 plus undo/redo and conflict highlight in `tests/e2e/solve.spec.js`

### Implementation for User Story 1

- [X] T023 [US1] Implement game state in `web/js/core/game.js`: fields data-model.md `GameState.puzzleId`, `GameState.values`, `GameState.elapsedMs`, `GameState.status`, `GameState.pauseReason`, `GameState.history`, `GameState.future` with `Move` records; invariants and transitions from data-model.md "Game state"; methods `setValue`, `clear`, `undo`, `redo`, `conflicts`, `isSolved`
- [X] T024 [P] [US1] Implement the active-time timer with `performance.now()` per research R8 in `web/js/core/timer.js`
- [X] T025 [P] [US1] Implement base layout CSS (header, board area, keypad below the board under 600 px, no horizontal scroll at 320 px, `touch-action: manipulation` on board and keypad) in `web/css/base.css`
- [X] T026 [P] [US1] Implement the light board theme (style B from `design/board-styles.html`: rounded frame, light cell lines, dark box borders on box groups, row/column/box tint, same-digit tint, red conflict tint, given vs player digit colors; cells scale with the board width so 320 px screens need no horizontal scroll) in `web/css/theme-light.css`
- [X] T027 [US1] Implement board render in `web/js/ui/board.js`: 9 box elements × 9 cells (research R11), classes for given/user/selected/peer/same/conflict, re-render only changed cells
- [X] T028 [US1] Implement keyboard and pointer input in `web/js/ui/input.js` per `contracts/ui.md` "Keyboard" (value mode only for now: arrows, digits by `code`, Backspace/Delete, Cmd/Ctrl+Z, redo keys, `P`; ignore `0` and letters)
- [X] T029 [P] [US1] Implement the on-screen keypad (buttons 1–9, Clear, Undo, Redo; `<button>` elements only per research R7) in `web/js/ui/keypad.js`
- [X] T030 [US1] Implement the header with level label, puzzle ID, timer display and Pause button (grid hidden while paused, FR-024) in `web/js/ui/header.js`
- [X] T031 [US1] Implement the completion dialog (ID, level, time) and the "grid full but wrong" notice in `web/js/ui/dialogs.js`
- [X] T032 [US1] Wire start-up in `web/js/main.js`: load a random Easy puzzle, compute the solution, set `?id=` with `history.replaceState`, start the timer, pause on `visibilitychange` hidden with `pauseReason` `hidden` and resume on visible only for that reason (data-model.md `GameState.pauseReason`)

**Checkpoint**: The game is playable end to end in Chrome and Safari (value entry only).

---

## Phase 4: User Story 2 - Candidate marks (Priority: P1)

**Goal**: Several small candidate digits per cell; a final value replaces them.

**Independent Test**: Add 2, 5, 7 as candidates in one cell, see them in fixed spots, enter 5 as a value, candidates are gone.

### Tests for User Story 2

- [X] T033 [P] [US2] Unit tests for candidate rules (toggle, ignored on a cell with a value, cleared by a value, one undo step per toggle, candidate-only cell counts as empty) in `tests/unit/candidates.test.js`
- [X] T034 [P] [US2] E2E test of spec US2 scenarios 1–5 (Shift+digit, `N` toggle, keypad mode button) in `tests/e2e/candidates.spec.js`

### Implementation for User Story 2

- [X] T035 [US2] Add `toggleCandidate` and candidate clearing to `web/js/core/game.js` using data-model.md `GameState.candidates` (bit mask) and its invariants
- [X] T036 [US2] Render candidates in `web/js/ui/board.js` as a 3×3 mini grid at fixed positions; candidate font at least half the value font height (FR-009) in `web/css/theme-light.css`
- [X] T037 [US2] Add candidate input to `web/js/ui/input.js` per `contracts/ui.md` "Digit entry rules" (Shift+digit always toggles; `N`/Space switch mode)
- [X] T038 [US2] Add the mode toggle button showing the current mode to `web/js/ui/keypad.js`

**Checkpoint**: Candidates work by keyboard and by keypad in both browsers.

---

## Phase 5: User Story 3 - Choose a level and a puzzle by ID (Priority: P1)

**Goal**: Level selector, "Puzzle #" field, address with the ID, copy link, not-found handling.

**Independent Test**: Open `/?id=300001` in Chrome and in Safari; both show the same Hard grid.

### Tests for User Story 3

- [X] T039 [P] [US3] E2E test of spec US3 scenarios 1–4 and the address table in `contracts/ui.md` (incl. `/?id=999999` → not found, game kept; same grid in `chromium` and `webkit`) in `tests/e2e/levels.spec.js`

### Implementation for User Story 3

- [X] T040 [US3] Add the level selector (Easy, Moderate, Hard, Evil) and the "Puzzle #" field with Go to `web/js/ui/header.js`
- [X] T041 [US3] Handle `?id=` in `web/js/main.js`: parse with `catalog.js`, load that puzzle, update the address on level change; on an invalid ID keep the current game
- [X] T042 [US3] Add the "Puzzle not found" dialog with a "random puzzle" action and the copy-fallback dialog (selectable text) to `web/js/ui/dialogs.js`
- [X] T043 [P] [US3] Implement link building and a clipboard helper (`navigator.clipboard.writeText` inside the click handler, fallback dialog on failure per research R10) in `web/js/core/share.js`
- [X] T044 [US3] Add the "Copy link" button to `web/js/ui/header.js`

**Checkpoint**: Any puzzle can be opened and shared by ID.

---

## Phase 6: User Story 4 - Check progress (Priority: P2)

**Goal**: A Check action marks wrong player values and counts them.

**Independent Test**: Enter one wrong digit, press Check, only that cell is marked and the message says 1 mistake.

### Tests for User Story 4

- [X] T045 [P] [US4] Unit tests for `check()` (wrong cells listed, empty cells never revealed, `assisted` only goes false→true) in `tests/unit/check.test.js`
- [X] T046 [P] [US4] E2E test of spec US4 scenarios 1–2, and that the page has no "show solution" control (FR-026), in `tests/e2e/check.spec.js`

### Implementation for User Story 4

- [X] T047 [US4] Add `check()` to `web/js/core/game.js` setting data-model.md `GameState.assisted`
- [X] T048 [US4] Add the Check button, wrong-cell marking (cleared on the next edit of that cell) and the result message to `web/js/ui/header.js` and `web/js/ui/board.js`

**Checkpoint**: Check works and the assisted flag is set.

---

## Phase 7: User Story 5 - Speed competition on one puzzle (Priority: P2)

**Goal**: Completion shows a clean/assisted result, a share text and the personal best for the ID.

**Independent Test**: Solve `100001` twice; the second completion shows the first time as personal best; Share result puts the text from `contracts/ui.md` on the clipboard.

### Tests for User Story 5

- [X] T049 [P] [US5] Unit tests for result building, share text format per `contracts/ui.md` "Share text", and personal best update rules in `tests/unit/share.test.js`
- [X] T050 [P] [US5] E2E test of spec US5 scenarios 1–3 and US4 scenario 3 (assisted label after a check with mistakes) (clipboard calls captured by a test stub in both engines; the fallback dialog is tested in `tests/e2e/levels.spec.js`) in `tests/e2e/result.spec.js`

### Implementation for User Story 5

- [X] T051 [US5] Add result building (data-model.md `Result.puzzleId`, `Result.level`, `Result.timeMs`, `Result.label`, `Result.date`) and share text to `web/js/core/share.js`
- [X] T052 [US5] Add personal best read/update (data-model.md "Personal best": only `clean` results, only lower times) to `web/js/storage.js` using key `ws:v1:best` per `contracts/storage.md`
- [X] T053 [US5] Extend the completion dialog in `web/js/ui/dialogs.js` with label, personal best, "Share result" and "New puzzle (same level)"

**Checkpoint**: Players can compare times by sharing results.

---

## Phase 8: User Story 6 - Keep progress after reload (Priority: P3)

**Goal**: Reload restores puzzle, values, candidates and elapsed time.

**Independent Test**: Enter values and candidates, reload, everything is back and the timer continues from the saved time.

### Tests for User Story 6

- [X] T054 [P] [US6] Unit tests for game save/restore (round trip; restored `playing` becomes `paused` until visible; mismatched givens reject the save) in `tests/unit/persist.test.js`
- [X] T055 [P] [US6] E2E test of spec US6 scenarios 1–2 and the "saved game + other `?id=`" row of `contracts/ui.md` in `tests/e2e/persist.spec.js`

### Implementation for User Story 6

- [X] T056 [US6] Add game serialize/restore to `web/js/storage.js` for key `ws:v1:game` (data-model.md `GameState.puzzleId`, `GameState.values`, `GameState.candidates`, `GameState.elapsedMs`, `GameState.status`, `GameState.assisted`; `history`/`future` not saved)
- [X] T057 [US6] Save after each move, on pause, on `pagehide`/`visibilitychange`, and every 5 s while playing in the focused tab; restore on start-up when no other `?id=` is given, in `web/js/main.js`

**Checkpoint**: All user stories work independently.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Dark theme, settings, browser parity, release checks

- [X] T058 [P] Implement the dark board theme (style D from `design/board-styles.html`: tiles, gaps between box groups, green player digits, same-digit outline, candidate size per FR-009) in `web/css/theme-dark.css`, active under `prefers-color-scheme: dark` or `html[data-theme=dark]`
- [X] T059 Add settings (data-model.md `Settings.theme`, `Settings.highlightConflicts`, `Settings.inputMode`) stored under `ws:v1:settings` in `web/js/storage.js`, and the theme switch (Auto/Light/Dark) and conflict-highlight switch to `web/js/ui/header.js`
- [X] T060 [P] E2E test for themes and settings (`emulateMedia` light/dark, manual override persists, conflict switch hides highlights) in `tests/e2e/themes.spec.js`
- [X] T061 [P] Board screenshot tests for both themes, with a separate baseline per engine (`chromium`, `webkit`), in `tests/e2e/visual.spec.js`; cross-engine parity for SC-009 is checked side by side in T066
- [X] T062 [P] E2E layout test at 320 px width on `mobile-safari` and `mobile-chrome`: no horizontal scroll, keypad below the board, no zoom on tap (FR-031) in `tests/e2e/mobile.spec.js`
- [X] T063 Add `// @ts-check` and JSDoc types to all modules in `web/js/` and fix reported issues
- [X] T064 [P] Write `README.md` (what the game is, how to run, how to add puzzles, the append-only rule for `web/puzzles/`)
- [X] T065 [P] E2E performance check for SC-001 (board interactive < 3 s after navigation) and SC-005 (cell shows a typed digit < 100 ms) in `chromium` and `webkit` in `tests/e2e/perf.spec.js`
- [X] T066 Run the full quickstart.md manual table in real Chrome and real Safari on macOS, compare the board side by side in both themes (SC-009), and fix any difference found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; blocks all stories. T019 (catalog run) needs T011–T018
- **US1 (Phase 3)**: depends on Foundational
- **US2, US3, US4, US6**: depend on US1 (they extend `game.js`, `board.js`, `input.js`, `header.js`, `main.js`)
- **US5**: depends on US1; uses the clipboard helper from US3 (T043)
- **Polish (Phase 9)**: after the stories it touches; T058 can start right after T027
- **Convergence (Phase 10)**: after Phase 9; T067 is a manual check by a person

### Story completion order

```text
Setup → Foundational → US1 ─┬─ US2
                            ├─ US3 ── US5
                            ├─ US4 ──┘ (assisted label)
                            └─ US6
                                 └─ Polish
```

### Within each story

- Tests first, and they must fail before the implementation
- `core/` logic before `ui/` modules before `main.js` wiring

---

## Parallel Examples

```bash
# Foundation tests together:
Task: "T006 grid tests in tests/unit/grid.test.js"
Task: "T007 solver tests in tests/unit/solver.test.js"
Task: "T008 grader tests in tests/unit/grader.test.js"
Task: "T009 catalog ID tests in tests/unit/catalog.test.js"
Task: "T010 storage tests in tests/unit/storage.test.js"

# US1: independent files together
Task: "T024 timer in web/js/core/timer.js"
Task: "T025 base layout in web/css/base.css"
Task: "T026 light theme in web/css/theme-light.css"
Task: "T029 keypad in web/js/ui/keypad.js"

# After US1: stories on separate developers
Developer A: US2 (candidates)
Developer B: US3 then US5
Developer C: US4, then US6
```

---

## Implementation Strategy

### MVP first

1. Phase 1 Setup and Phase 2 Foundational (catalog included)
2. Phase 3 US1 → validate in Chrome and Safari → MVP
3. Phase 4 US2 and Phase 5 US3: all P1 stories done → first public version

### Incremental delivery

4. US4 (check), then US5 (competition), then US6 (save progress)
5. Polish: dark theme, settings, visual and mobile tests, manual pass in both browsers

---

## Notes

- [P] tasks = different files, no dependencies on unfinished tasks
- Every story is checked in both `chromium` and `webkit`
- Never edit or reorder existing entries in `web/puzzles/*.json` (contracts/catalog.md, guarantee 5)
- Commit after each task or logical group

---

## Phase 10: Convergence

- [ ] T067 Manually compare the board side by side in real Chrome and real Safari on macOS in the dark theme (Theme: Dark), as T066 did for the light theme; a person does this step, because simulated input to the user's browsers is unsafe, per SC-009 (partial)
- [X] T068 Record `tools/serve.js` (dependency-free static server used by `npm start` and the Playwright webServer) and `tools/generate.js` (generator and canonical form shared by `tools/catalog.js` and the catalog test) in the plan's source tree in `specs/001-sudoku-game/plan.md` and in research R13 in `specs/001-sudoku-game/research.md`, per plan: Source Code structure (unrequested)
