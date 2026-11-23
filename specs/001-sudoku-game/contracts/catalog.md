# Contract: Puzzle Catalog

The catalog is the public, stable interface between the offline generator,
the game, and every player who shares a puzzle ID.

## Files

```text
web/puzzles/
├── index.json         # {"chunkSize": 1000, "levels": {"1": 10000, ...}}
├── level-1-001.json   # Easy, positions 1–1000
├── level-1-002.json   # Easy, positions 1001–2000
├── ...
└── level-4-010.json   # Evil, positions 9001–10000
```

- Level `L` is split into chunk files `level-L-KKK.json` (`KKK` = 001,
  002, …). Each holds `chunkSize` (1,000) entries; only the last chunk of a
  level may hold fewer.
- `index.json` gives the number of entries per level. The game loads it
  once, then only the one chunk it needs (about 87 KB, 33 KB gzip), so the
  first puzzle shows fast (SC-001) whatever the catalog size.
- Each chunk is a JSON array of strings. Each string is 81 characters,
  `0`–`9`, row-major, `0` = empty cell.

```json
[
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
  "..."
]
```

## ID mapping

- `id = level * 100000 + position`, where `position` is the 1-based
  position in the level (all its chunks in order).
- Position `p` is entry `(p - 1) % chunkSize` of chunk `ceil(p / chunkSize)`.
- Valid range per level: `L00001` … `L99999`, and only up to the count in
  `index.json`.
- Parse rule: the input string, with spaces and separators removed, must
  match `^[1-4][0-9]{5}$` and point to an existing entry. Anything else is
  "not found" (FR-022).

## Guarantees (checked by the catalog test)

1. Every entry has exactly one solution.
2. Every entry's grade equals its level.
3. Givens count is inside the level's range.
4. No duplicate grids across all files (also not after rotation,
   reflection or relabelling of digits).
5. **Append-only**: compared with the latest `release-*` git tag (or
   `main` if no tag exists), every existing
   entry is byte-identical at the same position. New entries go only to the
   end of the level (its last chunk, then a new chunk).
6. At least 1,000 entries per level (FR-017).
7. Every chunk file is under 100 KB; full chunks never change once
   written, so appending touches only the last chunk and `index.json`.
