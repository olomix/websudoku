// @ts-check
/**
 * Start-up and wiring: address → puzzle → game → views.
 */
import { getPuzzle, parseId, randomId } from "./core/catalog.js";
import { Game } from "./core/game.js";
import { colOf, parseGrid, rowOf } from "./core/grid.js";
import { buildResult, copyText, puzzleLink, shareText } from "./core/share.js";
import { solve } from "./core/solver.js";
import { formatTime } from "./core/timer.js";
import * as storage from "./storage.js";
import { createBoard } from "./ui/board.js";
import * as dialogs from "./ui/dialogs.js";
import { createHeader } from "./ui/header.js";
import { bindKeyboard } from "./ui/input.js";
import { createKeypad } from "./ui/keypad.js";

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

const settings = storage.loadSettings();
/** @type {Game} */
let game;
/** @type {number | null} */
let selected = null;
/** Cells marked by the last check; cleared when the cell is edited. */
let wrong = new Set();
let message = "";

const board = createBoard($("board"), (i) => {
  selected = i;
  render();
});
const keypad = createKeypad($("keypad"), {
  digit: (d) => enterDigit(d, false),
  clear: () => edit(() => selected !== null && game.clear(selected)),
  toggleMode,
  undo: () => undoRedo("undo"),
  redo: () => undoRedo("redo"),
});
const header = createHeader($("header"), {
  level: (l) => void openRandom(l),
  goto: (input) => void openById(input),
  togglePause,
  check,
  copyLink,
  theme: (t) => {
    settings.theme = t;
    applyTheme();
    storage.saveSettings(settings);
    render();
  },
  highlightConflicts: (on) => {
    settings.highlightConflicts = on;
    storage.saveSettings(settings);
    render();
  },
});
bindKeyboard({
  move,
  digit: enterDigit,
  clear: () => edit(() => selected !== null && game.clear(selected)),
  undo: () => undoRedo("undo"),
  redo: () => undoRedo("redo"),
  toggleMode,
  togglePause,
}, () => !dialogs.isOpen() && Boolean(game));
$("resume").addEventListener("click", togglePause);

function applyTheme() {
  if (settings.theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = settings.theme;
}

/** @param {string} text */
function say(text) {
  message = text;
  $("message").textContent = text;
}

function render() {
  if (!game) return;
  board.render({
    values: game.values,
    candidates: game.candidates,
    givens: game.givens,
    selected,
    conflicts: settings.highlightConflicts ? game.conflicts() : new Set(),
    wrong,
    paused: game.status === "paused",
  });
  $("paused-cover").hidden = game.status !== "paused";
  keypad.render({
    candidateMode: settings.inputMode === "candidate",
    canUndo: game.status === "playing" && game.history.length > 0,
    canRedo: game.status === "playing" && game.future.length > 0,
  });
  header.render({
    level: game.level,
    puzzleId: game.puzzleId,
    status: game.status,
    theme: settings.theme,
    highlightConflicts: settings.highlightConflicts,
  });
  header.setClock(formatTime(game.elapsedMs));
}

function tick() {
  if (game) header.setClock(formatTime(game.elapsedMs));
  requestAnimationFrame(tick);
}

/** @param {number} dRow @param {number} dCol */
function move(dRow, dCol) {
  if (selected === null) {
    selected = 40;
  } else {
    const r = Math.min(8, Math.max(0, rowOf(selected) + dRow));
    const c = Math.min(8, Math.max(0, colOf(selected) + dCol));
    selected = r * 9 + c;
  }
  render();
}

/**
 * Run one edit; afterwards save, refresh and react to completion.
 * @param {() => boolean | number | null} fn
 */
function edit(fn) {
  if (game.status !== "playing") return;
  const changed = fn();
  if (changed === false || changed === null) return;
  if (typeof changed === "number") wrong.delete(changed);
  else if (selected !== null) wrong.delete(selected);
  storage.saveGame(game);
  if (message) say("");
  render();
  afterEdit();
}

/** @param {number} d @param {boolean} asCandidate */
function enterDigit(d, asCandidate) {
  if (selected === null) return;
  const i = selected;
  const candidate = asCandidate || settings.inputMode === "candidate";
  edit(() => (candidate ? game.toggleCandidate(i, d) : game.setValue(i, d)));
}

/** @param {"undo" | "redo"} which */
function undoRedo(which) {
  edit(() => game[which]());
}

function afterEdit() {
  if (game.status === "solved") {
    complete();
  } else if (game.isFull()) {
    say("The grid is full, but something is wrong. Use Check to find it.");
  }
}

function complete() {
  const result = buildResult(game);
  const { best, improved } = storage.recordBest(result);
  say(`Solved in ${formatTime(result.timeMs)}.`);
  showCompletion(result, best, improved);
}

/**
 * @param {import("./core/share.js").Result} result
 * @param {{ timeMs: number } | null} best
 * @param {boolean} improved
 */
function showCompletion(result, best, improved) {
  dialogs.showCompletion({
    result,
    best,
    improved,
    onShare: () => void copy(shareText(result, puzzleLink(result.puzzleId)), "Result copied.",
      () => showCompletion(result, best, improved)),
    onNew: () => void openRandom(game.level),
  });
}

function toggleMode() {
  settings.inputMode = settings.inputMode === "candidate" ? "value" : "candidate";
  storage.saveSettings(settings);
  render();
}

function togglePause() {
  if (game.status === "playing") game.pause("user");
  else if (game.status === "paused") game.resume("user");
  else return;
  storage.saveGame(game);
  render();
}

function check() {
  if (game.status !== "playing") return;
  const found = game.check();
  wrong = new Set(found);
  storage.saveGame(game);
  say(found.length === 0 ? "No mistakes so far."
    : found.length === 1 ? "1 mistake." : `${found.length} mistakes.`);
  render();
}

/**
 * @param {string} text
 * @param {string} done message after a successful copy
 * @param {() => void} [back] reopens the dialog the fallback replaced
 */
async function copy(text, done, back) {
  if (await copyText(text)) say(done);
  else dialogs.showCopyFallback(text, back);
}

function copyLink() {
  void copy(puzzleLink(game.puzzleId), "Link copied.");
}

/**
 * @param {{ id: number, level: 1|2|3|4, givens: string }} p
 * @param {any} [saved] a saved game to restore when it matches
 */
function start(p, saved) {
  const keep = saved && game?.puzzleId === p.id ? selected : null;
  const givens = parseGrid(p.givens);
  const solution = /** @type {number[]} */ (solve(givens));
  const puzzle = { puzzleId: p.id, level: p.level, givens, solution };
  const restored = saved ? Game.restore(saved, puzzle) : null;
  game = restored ?? new Game(puzzle);
  if (restored && document.visibilityState === "visible") game.resume("hidden");
  if (!restored && document.visibilityState === "hidden") game.pause("hidden");
  selected = keep;
  wrong = new Set();
  say(game.status === "solved" ? `Solved in ${formatTime(game.elapsedMs)}.` : "");
  setAddress(p.id);
  // Writing back a restored game would echo it to other tabs as a change.
  if (!restored) storage.saveGame(game, { force: true });
  render();
}

/** @param {number} id */
function setAddress(id) {
  const url = new URL(location.href);
  url.searchParams.set("id", String(id));
  window.history.replaceState(null, "", url);
}

/** Only the newest puzzle request may replace the board. */
let request = 0;
/** Player puzzle requests still loading; another tab's save waits for them. */
let pending = 0;
const LOAD_ERROR = "The puzzle could not load. Check the connection and try again.";

/**
 * Run a player's puzzle request. When it ends without starting a game, a
 * newer save from another tab that arrived meanwhile is taken over.
 * @param {(mine: number) => Promise<void>} fn
 */
async function playerRequest(fn) {
  const mine = ++request;
  pending++;
  try {
    await fn(mine);
  } finally {
    pending--;
    if (!pending && storage.isStale()) void adoptSaved();
  }
}

/** @param {1|2|3|4} level */
function openRandom(level) {
  return playerRequest(async (mine) => {
    try {
      const p = await getPuzzle(await randomId(level));
      if (p && mine === request) start(p);
    } catch (e) {
      console.error(e);
      if (mine === request) say(LOAD_ERROR);
    }
  });
}

/**
 * Open a puzzle the player asked for; keep the current game if it is unknown
 * or cannot load.
 * @param {string} input
 */
function openById(input) {
  return playerRequest(async (mine) => {
    const parsed = parseId(input);
    let p = null;
    try {
      p = parsed ? await getPuzzle(parsed.id) : null;
    } catch (e) {
      console.error(e);
      if (mine === request) say(LOAD_ERROR);
      return;
    }
    if (mine !== request) return;
    if (!p) {
      dialogs.showNotFound(input, () => void openRandom(game?.level ?? 1));
      return;
    }
    if (p.id === game?.puzzleId) return;
    start(p);
  });
}

/**
 * Same puzzle and same board as the save, so nothing needs reloading.
 * @param {any} saved
 */
function sameBoard(saved) {
  if (!game || saved.puzzleId !== game.puzzleId) return false;
  if ((saved.status === "solved") !== (game.status === "solved")) return false;
  const eq = (/** @type {unknown} */ a, /** @type {number[]} */ b) =>
    Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
  return eq(saved.values, game.values) && eq(saved.candidates, game.candidates) &&
    saved.assisted === game.assisted;
}

/**
 * Take over a newer save written by another tab (contracts/storage.md).
 * The tab counts as up to date only once the save is really in use, so a
 * failed or superseded take-over never lets the old board overwrite it.
 */
async function adoptSaved() {
  if (pending) return;
  const saved = storage.peekGame();
  if (!saved) return;
  if (sameBoard(saved)) {
    // An echo of this tab's own game: keep undo history, marks and dialogs.
    if (saved.elapsedMs > game.elapsedMs) game.timer.set(saved.elapsedMs);
    storage.markRead(saved.rev);
    return;
  }
  const at = request;
  const p = await getPuzzle(saved.puzzleId).catch(() => null);
  if (!p || at !== request || pending) return;
  if (storage.peekGame()?.rev !== saved.rev) {
    void adoptSaved();
    return;
  }
  storage.markRead(saved.rev);
  dialogs.close();
  start(p, saved);
}

document.addEventListener("visibilitychange", () => {
  if (!game) return;
  if (document.visibilityState === "hidden") {
    game.pause("hidden");
    storage.saveGame(game);
  } else {
    game.resume("hidden");
  }
  render();
});
window.addEventListener("pagehide", () => game && storage.saveGame(game));
window.addEventListener("storage", (e) => {
  if (e.key === storage.KEYS.game && e.newValue && storage.isStale()) void adoptSaved();
});
// Only the focused tab saves on a timer, so two open tabs do not keep
// replacing each other's board.
setInterval(() => {
  if (game?.status === "playing" && document.hasFocus()) storage.saveGame(game);
}, 5000);

/**
 * A catalog that cannot load throws; nothing new is started then, so the
 * saved game is never replaced because of a network error.
 */
async function boot() {
  applyTheme();
  const saved = storage.loadGame();
  const param = new URL(location.href).searchParams.get("id");
  const parsed = param === null ? null : parseId(param);
  const p = parsed ? await getPuzzle(parsed.id) : null;
  if (p) {
    start(p, saved?.puzzleId === p.id ? saved : null);
  } else {
    await resumeOrRandom(saved);
    if (param !== null) dialogs.showNotFound(param, () => void openRandom(game.level));
  }
}

/** @param {any} saved */
async function resumeOrRandom(saved) {
  const id = parseId(saved?.puzzleId);
  const p = id ? await getPuzzle(id.id) : null;
  if (p) start(p, saved);
  else await openRandom(1);
  if (!game) throw new Error("no puzzle could load");
}

// Started before boot, so the clock runs even after a failed start that
// the player recovers from with a level button.
requestAnimationFrame(tick);
boot().catch((e) => {
  console.error(e);
  say("The game could not start. Check the connection and reload the page.");
});
