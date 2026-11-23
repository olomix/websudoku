# Sudoku

A browser Sudoku game with a clean board, candidate marks, four levels
(Easy, Moderate, Hard, Evil) and fixed puzzle numbers, so players can race
on the same puzzle and compare times.

The game is plain HTML, CSS and JavaScript modules in `web/`. It has no
build step, no server code and no runtime dependencies; any static host
serves it.

## Run

```sh
npm install                      # dev tools only: Vitest, Playwright, TypeScript
npm start                        # http://localhost:8080
```

## Test

```sh
npm test                         # unit tests (solver, grader, game rules, storage)
npm run test:catalog             # puzzle catalog guarantees
npx playwright install chromium webkit
npm run test:e2e                 # Chrome and Safari engines, desktop and phone
npm run typecheck                # JSDoc types in web/js
```

Visual baselines in `tests/e2e/visual.spec.js-snapshots/` are per engine
and per OS. After an intended board change, refresh them with
`npx playwright test visual --update-snapshots` and review the images.

## Puzzles

Puzzles live in `web/puzzles/`: 10,000 per level, split into files of
1,000 (`level-1-001.json` … `level-4-010.json`) plus `index.json` with the
count per level. Each entry is one 81-character string (`0` = empty). A
puzzle number is `level * 100000 + position`, so `300042` is Hard puzzle
42. The game loads only the one file a puzzle is in (about 33 KB gzip).

Add puzzles with:

```sh
npm run catalog -- --level 3 --count 100
npm run test:catalog
```

The tool keeps only puzzles with exactly one solution whose hardest needed
technique matches the level, and skips duplicates (also rotated, reflected
or relabelled ones).

**The catalog files are append-only.** Never change, remove or reorder an
existing entry: shared links and recorded times point to puzzle numbers.
The catalog test compares each file with the latest `release-*` git tag,
or with `main` when no tag exists, and fails when an existing entry
differs from that baseline. It also fails when the baseline ref is missing
(a shallow or single-branch clone needs
`git fetch origin main:refs/remotes/origin/main --tags`).

Tag every release that ships puzzles (`git tag release-YYYY-MM-DD`). On
`main` without a tag the baseline is the commit under test, so only
uncommitted edits are caught.

## Design documents

See `specs/001-sudoku-game/` for the spec, plan, data model and contracts.
