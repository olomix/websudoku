# Contract: Puzzle Catalog

The catalog is the public, stable interface between the offline generator,
the game, and every player who shares a puzzle ID.

## Files

```text
web/puzzles/
├── level-1.json   # Easy
├── level-2.json   # Moderate
├── level-3.json   # Hard
└── level-4.json   # Evil
```

Each file is a JSON array of strings. Each string is 81 characters,
`0`–`9`, row-major, `0` = empty cell.

```json
[
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
  "..."
]
```

## ID mapping

- `id = level * 100000 + position`, where `position` is the 1-based array
  index in `level-<level>.json`.
- Valid range per level: `L00001` … `L99999`, and only up to the file
  length.
- Parse rule: the input string, with spaces and separators removed, must
  match `^[1-4][0-9]{5}$` and point to an existing entry. Anything else is
  "not found" (FR-022).

## Guarantees (checked by the catalog test)

1. Every entry has exactly one solution.
2. Every entry's grade equals its file's level.
3. Givens count is inside the level's range.
4. No duplicate grids across all files (also not after rotation,
   reflection or relabelling of digits).
5. **Append-only**: compared with the latest `release-*` git tag (or
   `main` if no tag exists), every existing
   entry is byte-identical at the same position. New entries go only to the
   end of a file.
6. At least 1,000 entries per level (FR-017).
