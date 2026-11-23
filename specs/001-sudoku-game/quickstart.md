# Quickstart: Run and Validate

## Prerequisites

- Node.js 26 LTS (tools and tests only; the game itself needs nothing).
- Google Chrome and Safari (current versions) for the manual pass.

## Setup

```sh
npm install                      # Vitest, Playwright (dev only)
npx playwright install chromium webkit
```

## Build the catalog (only when adding puzzles)

```sh
npm run catalog -- --level 4 --count 50   # appends 50 new Evil puzzles
npm run test:catalog                      # uniqueness, grades, append-only
```

## Run the game

```sh
npm start            # static server on http://localhost:8080
```

## Automated validation

```sh
npm test             # unit tests (solver, grader, game rules, storage)
npm run test:e2e     # Playwright: chromium + webkit, desktop + mobile
```

Expected: all tests pass in both `chromium` and `webkit` projects.

## Manual validation (both browsers)

Run each step in Chrome, then in Safari.

| # | Step | Expected | Spec |
|---|------|----------|------|
| 1 | Open `http://localhost:8080/` | Easy puzzle, ID in the address, timer runs | Story 1 |
| 2 | Type a digit in an empty cell | Digit in player color | FR-002 |
| 3 | Shift+2, Shift+5, Shift+7 in one cell | Three small marks at fixed spots | Story 2 |
| 4 | Type 5 in that cell | Value 5, marks gone | FR-011 |
| 5 | Enter a duplicate digit in a row | Both cells marked as conflict | FR-006 |
| 6 | Cmd+Z, then Cmd+Shift+Z | Undo, then redo | FR-007 |
| 7 | Open `/?id=300001` in a second browser | Same grid, level Hard | SC-002 |
| 8 | Open `/?id=999999` | "Puzzle not found", game kept | FR-022 |
| 9 | Click Check with one wrong digit | Only that cell marked | Story 4 |
| 10 | Switch to another tab for 10 s | Timer does not count that time | FR-024 |
| 11 | Reload the page | Same digits, marks, time | SC-007 |
| 12 | Set system to dark mode | Dark tiles board (style D) | FR-036 |
| 13 | Solve puzzle `100001` with its known solution | Success message, time, label, share | Story 5 |
| 14 | Click Share result, paste in a text editor | Share text per [contracts/ui.md](contracts/ui.md) | FR-028 |
| 15 | Narrow the window to 320 px (or phone) | No horizontal scroll, keypad below board | FR-031 |
