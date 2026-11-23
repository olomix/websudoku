# Research: Browser Sudoku Game

**Feature**: [spec.md](spec.md) | **Date**: 2026-11-23

Versions below were checked on 2026-11-23 against the npm registry and
nodejs.org.

## R1. Runtime stack

- **Decision**: Plain HTML, CSS and JavaScript (ES2022 modules), no UI
  framework, no bundler. The browser loads `index.html` and native ES
  modules directly.
- **Rationale**: One screen, ~10 UI parts, no server. A framework adds
  build steps and bundle weight for no gain. Native modules work in all
  current Chrome and Safari versions (FR-033).
- **Alternatives considered**: React/Preact/Svelte (build step, extra
  dependency for a single view); TypeScript (type safety, but needs a build;
  JSDoc types with `// @ts-check` give most of the benefit with no build).

## R2. Puzzle catalog: predefined, generated offline

- **Decision**: A Node script (`tools/`) generates puzzles, proves each has
  exactly one solution, grades it by the techniques it needs, and appends it
  to the catalog. The catalog ships as static JSON files, one per level.
  The browser never generates puzzles.
- **Rationale**: Spec FR-014–FR-018: same ID gives the same grid for every
  player, unique solution, level by technique. Doing this offline keeps the
  page fast and lets us reject bad puzzles before release.
- **Alternatives considered**: Seeded generator in the browser (ID = seed).
  Rejected: a change to the generator code silently changes every puzzle, so
  IDs are not stable across releases; grading in the browser costs time on
  phones.

## R3. Difficulty grading

- **Decision**: A human-style logic solver applies techniques in a fixed
  order, easiest first, and records the hardest technique used. Level rules:

  | Level | Allowed techniques (hardest needed decides the level) |
  |-------|--------------------------------------------------------|
  | Easy | Naked single, hidden single |
  | Moderate | + locked candidates (pointing, claiming), naked/hidden pair |
  | Hard | + naked/hidden triple and quad, X-Wing |
  | Evil | + Swordfish, XY-Wing, XYZ-Wing, simple coloring |

  A puzzle that the solver cannot finish with this set is rejected (no
  guessing is ever needed). Givens count is a secondary filter: Easy 36–40,
  Moderate 30–35, Hard 26–31, Evil 22–28.
- **Rationale**: FR-016 says the level depends on techniques, not on the
  givens count. A fixed technique ladder is testable and repeatable.
- **Alternatives considered**: Count of givens only (spec rejects it);
  backtracking-step count (does not match human difficulty).

## R4. Puzzle ID scheme and stability

- **Decision**: IDs are 6-digit numbers `L NNNNN`: first digit is the level
  (1 Easy, 2 Moderate, 3 Hard, 4 Evil), the next five digits are the
  1-based index in that level's file. Example: `300042` = Hard #42. Catalog
  files are append-only: an existing entry is never changed, removed or
  reordered. The catalog test compares each file with its copy at the
  latest `release-*` git tag, or at `main` if no tag exists yet.
- **Rationale**: The ID alone tells the level (spec assumption), it is short
  enough to type and say, and 99,999 slots per level is far above the
  1,000-per-level target (FR-017).
- **Alternatives considered**: Random large numbers like the reference site
  (harder to type, needs a lookup table); hash of the grid (not human
  friendly).

## R5. Catalog file format and size

- **Decision**: Each level is split into chunk files of 1,000
  81-character strings (`web/puzzles/level-L-KKK.json`, `0` = empty), plus
  `web/puzzles/index.json` with the count per level (contracts/catalog.md).
  The catalog ships 10,000 puzzles per level. Only givens ship; the browser
  computes the solution with a fast backtracking solver when the puzzle
  loads (< 5 ms). The game loads the index and only the one chunk it needs.
- **Rationale**: One chunk is 1,000 × 87 bytes ≈ 87 KB before gzip, about
  33 KB after, whatever the catalog size. A single file per level would be
  870 KB (about 330 KB gzip) at 10,000 puzzles, too slow for the 3 s first
  puzzle (SC-001) on a slow phone link. Shipping solutions would double the
  size and make "check" answers trivial to read in the network panel.
- **Alternatives considered**: One file per level (fine at 1,000 puzzles,
  10× too big at 10,000); one file for all levels (loads 4× more than
  needed); binary packing (smaller, but hard to review in diffs).

## R6. Address (URL) format

- **Decision**: `?id=300042` in the query string. No ID: random Easy puzzle,
  then the address is updated with `history.replaceState`. A level choice
  loads a random puzzle of that level and sets `?id=`.
- **Rationale**: FR-020 needs the ID in the address. Query strings work on
  any static host with one `index.html`, need no server routing, and survive
  copy/paste in chat apps better than `#` fragments in some clients.
- **Alternatives considered**: Path `/p/300042` (needs host rewrite rules);
  hash `#300042` (works, but some share targets drop fragments).

## R7. Input handling across Chrome and Safari

- **Decision**: Keyboard input uses `KeyboardEvent.code` (`Digit1`–`Digit9`,
  `Numpad1`–`Numpad9`) so that Shift+digit works on every layout. When
  `code` is not a digit key (synthetic keys from on-screen keyboards), the
  digit is read from `key` instead.
  Shift+digit = add/remove candidate (FR-010 modifier). `N` and Space toggle
  candidate mode. On-screen keypad uses `<button>` elements, not `<input>`,
  so iOS Safari never opens the system keyboard or zooms. The board sets
  `touch-action: manipulation` to stop double-tap zoom on iOS.
- **Rationale**: `e.key` for Shift+5 is `%`, and Option+digit on macOS gives
  symbols, so `e.key` is not reliable. Inputs on iOS cause focus zoom under
  16 px fonts.
- **Alternatives considered**: Hidden `<input>` per cell (iOS zoom and
  caret problems); Alt+digit as modifier (macOS turns it into symbols).

## R8. Timer

- **Decision**: Elapsed time = sum of active intervals measured with
  `performance.now()`. `visibilitychange` (hidden) and the Pause button stop
  the clock; the display refreshes with `requestAnimationFrame` at most
  once per second change. Elapsed time is saved to storage on every pause
  and every 5 s in the focused tab.
- **Rationale**: `setInterval` drifts and is throttled in background tabs,
  most of all in Safari. Summing `performance.now()` deltas meets SC-006
  (< 1 s error per hour).
- **Alternatives considered**: `Date.now()` (affected by clock changes).

## R9. Local storage

- **Decision**: `localStorage` with versioned keys:
  `ws:v1:game`, `ws:v1:best`, `ws:v1:settings`. All reads are wrapped:
  parse errors or unknown versions reset that key.
- **Rationale**: Small data (< 10 KB), synchronous API, works in both
  browsers. Safari private mode allows `localStorage` in current versions;
  a failed write is caught and the game keeps working without save.
- **Alternatives considered**: IndexedDB (async, much more code for
  < 10 KB); cookies (sent to the server for no reason).

## R10. Clipboard (copy link, share result)

- **Decision**: `navigator.clipboard.writeText` called directly inside the
  click handler. If it fails, show the text in a selectable field with
  "copy manually".
- **Rationale**: Safari allows clipboard writes only during a user gesture
  and only in a secure context; both hold for a click on an HTTPS page or
  `localhost`.
- **Alternatives considered**: `document.execCommand('copy')` (deprecated).

## R11. Themes

- **Decision**: CSS custom properties per theme. Default follows
  `prefers-color-scheme`. Manual choice (Auto / Light / Dark) sets
  `data-theme` on `<html>` and is saved in settings. Light = board style B,
  dark = board style D from [design/board-styles.html](design/board-styles.html).
  The dark board uses a different layout (tiles with gaps per box), so the
  board DOM always groups cells into 9 box elements; the light theme draws
  box borders on those groups.
- **Rationale**: One DOM for both themes (FR-034–FR-036); theme switch is a
  CSS-only change.

## R12. Testing

- **Decision**:
  - Unit tests: Vitest 5.1.1 for pure logic (solver, grader, validation,
    timer math, storage codec, share text). No DOM needed for these.
  - End-to-end tests: Playwright 1.65.1 with two projects, `chromium` and
    `webkit` (Safari engine), plus mobile emulation (`iPhone 15`,
    `Pixel 8`). Screenshot comparison of the board in both engines checks
    SC-009.
  - Manual pass in real Safari and real Chrome on macOS before release,
    because Playwright WebKit is close to Safari but not identical.
  - Catalog test: every catalog puzzle has one solution and its grade
    matches its file (SC-003).
- **Rationale**: Covers both required browsers automatically, plus a real
  Safari check for engine differences.
- **Alternatives considered**: Jest (slower ESM support); Cypress (no
  WebKit support for Safari checks).

## R13. Tooling and hosting

- **Decision**: Node.js 26 LTS (26.13.1) for tools and tests only; the game
  has no runtime dependencies. Local dev server: `tools/serve.js`, a small
  Node static server with no dependencies, used by `npm start` and the
  Playwright webServer (sends `no-store`, so tests never see stale files).
  Hosting: any static host (GitHub Pages fits the repo location).
- **Rationale**: Static files only; HTTPS from the host gives the secure
  context the clipboard needs.
- **Alternatives considered**: `npx serve` (a download on every run) and
  `python3 -m http.server` (an extra runtime for contributors).
