# Contract: Player-Facing Interface

## Address

| Address | Result |
|---------|--------|
| `/` | Random Easy puzzle; address becomes `/?id=<id>` (replace, no new history entry) |
| `/?id=300042` | Puzzle 300042 (Hard #42) |
| `/?id=<invalid>` | "Puzzle not found" message and a "random puzzle" action; no saved game is lost |
| Saved game exists and `/` is opened | Saved game is restored |
| Saved game exists and `/?id=X` with another ID | Puzzle X loads; saved game is replaced |

## Keyboard

Key matching uses the physical key (`code`), so it works on any layout.

| Key | Action |
|-----|--------|
| Arrow keys | Move selection (stops at the edge) |
| `1`–`9` (top row or numpad) | Enter the digit in the current mode |
| Shift + `1`–`9` | Toggle the candidate, whatever the mode |
| `N` or Space | Toggle the mode between value and candidate |
| Backspace / Delete | Clear the cell (value and candidates) |
| `0`, letters, other keys | Ignored (spec edge case) |
| Auto-repeat of a held key | Ignored, except arrow keys |
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Shift + Z, Ctrl + Y | Redo |
| `P` | Pause / resume |

A click or tap on a cell takes keyboard focus away from any focused field
or button, so the next key goes to the board. A digit key without a
physical key code (on-screen keyboards) is read from its character.

Digit entry rules:

- Value mode, cell empty or holds candidates → set value, clear candidates.
- Value mode, same digit already in the cell → clear the value.
- Candidate mode or Shift → toggle that candidate; ignored if the cell has a
  value.
- Any entry on a given cell → ignored.

## On-screen controls

- Keypad: buttons 1–9, Clear, mode toggle (shows the current mode), Undo,
  Redo. Shown on all screens; on narrow screens it sits below the board.
- Header: level selector (Easy, Moderate, Hard, Evil), "Puzzle #" field with
  Go, puzzle ID and level label, timer, Pause, Check, Copy link, theme
  switch (Auto / Light / Dark), conflict-highlight switch.

## Check

- Marks each player value that differs from the solution.
- Message: "N mistakes" or "No mistakes so far".
- If N > 0, the game becomes `assisted`.
- Never reveals a value for an empty cell.

## Completion message

Shows: puzzle ID, level, time `m:ss` (or `h:mm:ss`), label `clean` /
`assisted`, the personal best for this ID, and actions "Share result",
"New puzzle (same level)".

## Share text (clipboard)

```text
Sudoku #300042 (Hard) — solved in 7:42, clean
https://<host>/?id=300042
```

## Copy fallback

When the clipboard is blocked, a dialog shows the text in a selectable
field. Opened from the completion dialog, its button is "Back" and returns
to the completion dialog.

## Load errors

If a level file cannot load, the current board stays and the message line
says the puzzle could not load. "Puzzle not found" is only for IDs that do
not exist. On start-up, a saved game whose level file cannot load is kept,
not replaced by a new puzzle.

## Copy link (clipboard)

`https://<host>/?id=<id>` — the current page origin and path.
