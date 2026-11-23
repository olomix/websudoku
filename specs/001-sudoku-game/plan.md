# Implementation Plan: Browser Sudoku Game

**Branch**: `001-sudoku-game` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-sudoku-game/spec.md`

## Summary

A single-page Sudoku game in plain HTML, CSS and JavaScript modules, served
as static files. Puzzles come from a predefined, append-only catalog with
stable 6-digit IDs (first digit = level), built offline by a Node tool that
proves uniqueness and grades each puzzle by the logic techniques it needs.
The page supports final digits and candidate marks, undo/redo, conflict
highlight, check, a visibility-aware timer, shareable puzzle links and
results, personal best times and saved progress in device storage, and two
themes (light "Soft modern", dark "Dark tiles"). It must behave the same in
Chrome and Safari, desktop and phone.

## Technical Context

**Language/Version**: JavaScript ES2022 modules, HTML, CSS; JSDoc types
with `// @ts-check`. Node.js 26 LTS (26.13.1) for tools and tests only.

**Primary Dependencies**: None at runtime. Dev only: Vitest 5.1.1,
@playwright/test 1.65.1.

**Storage**: Browser `localStorage` (game, best times, settings), see
[contracts/storage.md](contracts/storage.md). Catalog: static JSON files.

**Testing**: Vitest (unit, catalog); Playwright with `chromium` and `webkit`
projects plus mobile emulation (e2e); manual pass in real Chrome and Safari.

**Target Platform**: Current and previous stable Chrome and Safari on macOS,
iOS Safari, Android Chrome. Static hosting over HTTPS.

**Project Type**: Static web application (client only) plus an offline
catalog tool.

**Performance Goals**: Digit entry renders in < 100 ms (SC-005); first
puzzle playable < 3 s on page open (SC-001); solution compute < 5 ms.

**Constraints**: No server, no build step, no runtime dependencies; works at
320 px width; timer error < 1 s per hour (SC-006).

**Scale/Scope**: 1 screen; ≥ 1,000 puzzles per level (~35 KB gzip per level
file).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template: it
defines no principles, so there are no gates to fail. Result: **PASS
(no constitution)**. Run `/speckit-constitution` to add project rules; this
plan should then be re-checked.

Post-design re-check: **PASS** (no change; no principles defined).

## Project Structure

### Documentation (this feature)

```text
specs/001-sudoku-game/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities and rules
├── quickstart.md        # Phase 1 run and validation guide
├── contracts/
│   ├── catalog.md       # Puzzle files, ID mapping, append-only rule
│   ├── ui.md            # Address, keyboard, controls, share text
│   └── storage.md       # Device storage keys and formats
├── design/
│   └── board-styles.html  # Chosen board looks (B light, D dark)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
web/                      # Deployed as-is to the static host
├── index.html
├── css/
│   ├── base.css          # Layout, header, keypad, dialogs
│   ├── theme-light.css   # Board style B
│   └── theme-dark.css    # Board style D
├── js/
│   ├── main.js           # Start-up: address → puzzle → render
│   ├── core/             # Pure logic, no DOM; shared with tools/
│   │   ├── grid.js       # Indexes, peers, conflict detection
│   │   ├── solver.js     # Fast backtracking solver, solution count
│   │   ├── techniques.js # Human-style techniques for grading
│   │   ├── grader.js     # Technique ladder → level
│   │   ├── game.js       # Game state, moves, undo/redo, check, solved
│   │   ├── timer.js      # Active-time accounting
│   │   ├── catalog.js    # ID parse/format, level file lookup
│   │   └── share.js      # Share text and links
│   ├── storage.js        # localStorage codec (versioned, safe)
│   └── ui/
│       ├── board.js      # Board render (9 box groups × 9 cells)
│       ├── input.js      # Keyboard and pointer handling
│       ├── keypad.js     # On-screen keypad
│       ├── header.js     # Level, ID field, timer, actions
│       └── dialogs.js    # Not found, completion, copy fallback
└── puzzles/
    └── level-{1..4}.json

tools/
├── catalog.js            # CLI: generate, grade, dedupe, append puzzles
├── generate.js           # Puzzle generator and canonical form (shared with tests)
└── serve.js              # Dependency-free static server for npm start and e2e

tests/
├── unit/                 # Vitest: core/*, storage
├── catalog/              # Vitest: catalog guarantees (contracts/catalog.md)
└── e2e/                  # Playwright: chromium + webkit, desktop + mobile

package.json              # Dev deps and scripts (start, test, test:e2e, catalog)
playwright.config.js
```

**Structure Decision**: One static web app in `web/`, with all game rules
in `web/js/core/` as pure modules. The offline tool in `tools/` imports the
same `core/` modules, so the browser and the generator use one solver and
one grader. Tests live outside `web/` so they never ship.

## Key design points

- **Catalog first.** The solver, grader and catalog tool come before the UI:
  stable IDs depend on them, and the catalog must exist before the game can
  load a puzzle (R2–R5).
- **Board DOM** always has 9 box groups of 9 cells. The light theme draws
  borders on groups; the dark theme draws gaps between them (R11).
- **Input** uses physical key codes; the keypad uses buttons (R7).
- **Timer** sums `performance.now()` intervals and stops when the page is
  hidden (R8).
- **Safari parity** is checked by Playwright WebKit on every run, and by a
  manual Safari pass before release (R12).

## Complexity Tracking

No constitution violations to justify.
