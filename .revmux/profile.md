# Review profile: websudoku

## What the software is

- A browser Sudoku game: static HTML, CSS and JavaScript ES modules in
  `web/`, no build step, no runtime dependencies, no server code.
- Puzzles ship as pre-generated JSON in `web/puzzles/level-1..4.json`,
  made offline by `tools/catalog.js` (Node). The browser never generates
  puzzles.
- State lives only in the player's `localStorage` (game, best times,
  settings). No accounts, no network writes.
- Must behave the same in current Chrome and Safari, desktop and phone.
- Source of truth for behavior: `specs/001-sudoku-game/` (spec, plan,
  data-model, contracts). Code that disagrees with a contract is a finding.

## What a real failure looks like

- A puzzle ID that opens a different grid than before (shared links and
  recorded times break). The catalog files are append-only.
- A catalog puzzle with zero or two solutions, or graded into the wrong
  level; a solving technique that removes the true digit.
- Lost player progress: a save overwritten (other tab, load error, restore
  bug), undo history or candidates corrupted.
- Wrong time: hidden or paused time counted, a manual pause undone without
  the player.
- Input that works in Chrome but not Safari (or the reverse), on keyboard
  or touch; keys that reach the wrong control.
- A crash or blank page on start-up, including offline or a failed fetch.

## Blast radius

- Players' own devices only. No personal data, no backend, no payments.
- The worst outcome is a broken game or lost progress for a player, or a
  catalog change that silently changes existing puzzle IDs.

## Reporting bar

- Report correctness defects in `web/js/`, `tools/` and the catalog
  tests, and contradictions between code and `specs/001-sudoku-game/`.
- Report a missing test only when a real failure above could slip through.
- Do not report: style preferences, naming taste, micro-optimizations,
  theoretical races that need more than two open tabs plus a network
  failure at the same moment, or dev-only tooling hardening beyond "it
  must not crash or serve files outside `web/`".
- Accessibility and UI polish: report only what breaks play (focus
  traps, unreadable digits, controls that cannot be reached).

## Deliberate conventions (not findings)

- No framework, no bundler, no TypeScript files: JSDoc types with
  `// @ts-check`, checked by `npm run typecheck`.
- `tools/serve.js` is a dev and test server only; production is any
  static host (GitHub Pages).
- `web/puzzles/*.json` is generated data, one entry per line; do not
  review entries one by one.
- Visual baselines in `tests/e2e/visual.spec.js-snapshots/` are per
  engine and per OS by design.
- Comments explain why, not what; short comments are intended.
- Commit messages have no conventional-commit prefixes.
