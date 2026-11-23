# Data Model: Browser Sudoku Game

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Cells are indexed 0–80, row-major (`index = row * 9 + col`).

## Level

| Value | Name | ID prefix |
|-------|------|-----------|
| 1 | Easy | `1` |
| 2 | Moderate | `2` |
| 3 | Hard | `3` |
| 4 | Evil | `4` |

## Puzzle (catalog entry, read-only)

| Field | Type | Rules |
|-------|------|-------|
| `id` | 6-digit integer | `level * 100000 + index`, index 1–99,999 (R4) |
| `level` | Level | First digit of `id` |
| `givens` | string, 81 chars | `0`–`9`; `0` = empty; stored in catalog |
| `solution` | string, 81 chars | `1`–`9`; computed on load, never stored |

Validation (offline tool and catalog test):

- Exactly one solution.
- Grade from the technique ladder equals `level` (R3).
- Givens count in the level's range (R3).
- No entry changes, moves or disappears between releases (append-only).

## Game state (one current game, saved on the device)

| Field | Type | Rules |
|-------|------|-------|
| `puzzleId` | integer | Must exist in the catalog |
| `values` | int[81] | 0 = empty; given cells always equal `givens` |
| `candidates` | int[81] | Bit mask, bit `d-1` set = candidate `d`; 0 for cells with a value |
| `elapsedMs` | integer ≥ 0 | Active time only |
| `status` | enum | `playing`, `paused`, `solved` |
| `pauseReason` | enum or null | `user` (Pause button) or `hidden` (page hidden); null unless `paused`; saved, and a restored game keeps `user` only when it was saved paused with reason `user`, else gets `hidden` |
| `assisted` | boolean | True once a check found at least one mistake |
| `history` | Move[] | Undo stack; not saved (FR-030) |
| `future` | Move[] | Redo stack; cleared by any new move |

**Move**: `{ cell, before: {value, candidates}, after: {value, candidates} }`.
One user action = one move (FR-007). A final digit that clears candidates
is still one move.

### Invariants

- A given cell never changes.
- A cell has either a value or candidates, never both (FR-011).
- A cell with only candidates counts as empty (FR-012).
- `solved` ⇔ every `values[i] == solution[i]`.

### State transitions

```text
        load puzzle
            │
            ▼
   ┌──────► playing ──── all cells correct ───► solved
   │          │  ▲
   │  pause / │  │ resume / page visible
   │  hidden  ▼  │
   └──────── paused
```

- Page visible again resumes only when `pauseReason` is `hidden`; a `user` pause waits for the Pause button (FR-024).
- `solved` is final for this game. The timer stops; input is ignored; undo
  is disabled.
- Loading another puzzle replaces the game state (spec story 6, scenario 2).
- `assisted` only goes from false to true.

## Result (shown on completion, not stored as a list)

| Field | Type |
|-------|------|
| `puzzleId` | integer |
| `level` | Level |
| `timeMs` | integer |
| `label` | `clean` or `assisted` |
| `date` | ISO date |

## Personal best (saved on the device)

Map `puzzleId → { timeMs, date }`. Only `clean` results update it, and only
when `timeMs` is lower than the stored value.

## Settings (saved on the device)

| Field | Type | Default |
|-------|------|---------|
| `theme` | `auto` / `light` / `dark` | `auto` |
| `highlightConflicts` | boolean | `true` (FR-006) |
| `inputMode` | `value` / `candidate` | `value` |
