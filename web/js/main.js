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
  if (selected !== null) wrong.delete(selected);
  if (typeof changed === "number") wrong.delete(changed);
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
  dialogs.showCompletion({
    result,
    best,
    improved,
    onShare: () => void copy(shareText(result, puzzleLink(result.puzzleId)), "Result copied."),
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

/** @param {string} text @param {string} done */
async function copy(text, done) {
  if (await copyText(text)) say(done);
  else dialogs.showCopyFallback(text);
}

function copyLink() {
  void copy(puzzleLink(game.puzzleId), "Link copied.");
}

/**
 * @param {{ id: number, level: 1|2|3|4, givens: string }} p
 * @param {any} [saved] a saved game to restore when it matches
 */
function start(p, saved) {
  const givens = parseGrid(p.givens);
  const solution = /** @type {number[]} */ (solve(givens));
  const puzzle = { puzzleId: p.id, level: p.level, givens, solution };
  const restored = saved ? Game.restore(saved, puzzle) : null;
  game = restored ?? new Game(puzzle);
  if (restored && document.visibilityState === "visible") game.resume("hidden");
  if (!restored && document.visibilityState === "hidden") game.pause("hidden");
  selected = null;
  wrong = new Set();
  say(game.status === "solved" ? `Solved in ${formatTime(game.elapsedMs)}.` : "");
  setAddress(p.id);
  storage.saveGame(game);
  render();
}

/** @param {number} id */
function setAddress(id) {
  const url = new URL(location.href);
  url.searchParams.set("id", String(id));
  window.history.replaceState(null, "", url);
}

/** @param {1|2|3|4} level */
async function openRandom(level) {
  const p = await getPuzzle(await randomId(level));
  if (p) start(p);
}

/**
 * Open a puzzle the player asked for; keep the current game if it is unknown.
 * @param {string} input
 */
async function openById(input) {
  const parsed = parseId(input);
  const p = parsed ? await getPuzzle(parsed.id).catch(() => null) : null;
  if (!p) {
    dialogs.showNotFound(input, () => void openRandom(game?.level ?? 1));
    return;
  }
  if (p.id === game?.puzzleId) return;
  start(p);
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
setInterval(() => {
  if (game?.status === "playing") storage.saveGame(game);
}, 5000);

async function boot() {
  applyTheme();
  const saved = storage.loadGame();
  const param = new URL(location.href).searchParams.get("id");
  if (param !== null) {
    const parsed = parseId(param);
    const p = parsed ? await getPuzzle(parsed.id).catch(() => null) : null;
    if (p) {
      start(p, saved?.puzzleId === p.id ? saved : null);
    } else {
      await resumeOrRandom(saved);
      dialogs.showNotFound(param, () => void openRandom(game.level));
    }
  } else {
    await resumeOrRandom(saved);
  }
  requestAnimationFrame(tick);
}

/** @param {any} saved */
async function resumeOrRandom(saved) {
  const p = saved ? await getPuzzle(saved.puzzleId).catch(() => null) : null;
  if (p) start(p, saved);
  else await openRandom(1);
}

boot().catch((e) => {
  console.error(e);
  say("The game could not start. Reload the page to try again.");
});
