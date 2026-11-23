// @ts-check
/**
 * The player's work on one puzzle (data-model.md "Game state").
 */
import { CELLS, findConflicts } from "./grid.js";
import { Timer } from "./timer.js";

/**
 * @typedef {{ value: number, candidates: number }} CellState
 * @typedef {{ cell: number, before: CellState, after: CellState }} Move
 * @typedef {"playing" | "paused" | "solved"} Status
 * @typedef {"user" | "hidden"} PauseReason
 */

const bit = (/** @type {number} */ d) => 1 << (d - 1);

export class Game {
  /**
   * @param {object} p
   * @param {number} p.puzzleId
   * @param {1|2|3|4} p.level
   * @param {number[]} p.givens 81 values, 0 = empty
   * @param {number[]} p.solution 81 values
   * @param {() => number} [p.now] clock for the timer
   */
  constructor({ puzzleId, level, givens, solution, now }) {
    this.puzzleId = puzzleId;
    this.level = level;
    this.givens = givens;
    this.solution = solution;
    this.values = [...givens];
    this.candidates = new Array(CELLS).fill(0);
    /** @type {Status} */
    this.status = "playing";
    /** @type {PauseReason | null} */
    this.pauseReason = null;
    this.assisted = false;
    /** @type {Move[]} */
    this.history = [];
    /** @type {Move[]} */
    this.future = [];
    this.timer = new Timer(now);
    this.timer.start();
  }

  get elapsedMs() {
    return this.timer.elapsed();
  }

  /** @param {number} i */
  isGiven(i) {
    return this.givens[i] !== 0;
  }

  /** @param {number} i */
  canEdit(i) {
    return this.status === "playing" && !this.isGiven(i);
  }

  /** @param {number} i @returns {CellState} */
  cell(i) {
    return { value: this.values[i], candidates: this.candidates[i] };
  }

  /**
   * Record and apply one move; one user action is one undo step.
   * @param {number} i
   * @param {CellState} after
   */
  apply(i, after) {
    const before = this.cell(i);
    if (before.value === after.value && before.candidates === after.candidates) return false;
    this.history.push({ cell: i, before, after });
    this.future = [];
    this.put(i, after);
    return true;
  }

  /** @param {number} i @param {CellState} s */
  put(i, s) {
    this.values[i] = s.value;
    this.candidates[i] = s.candidates;
    if (this.isSolved()) {
      this.status = "solved";
      this.pauseReason = null;
      this.timer.stop();
    }
  }

  /**
   * Value mode entry: set the digit, or clear it when the same digit is
   * already there. A value removes the cell's candidates.
   * @param {number} i
   * @param {number} d 1-9
   */
  setValue(i, d) {
    if (!this.canEdit(i) || d < 1 || d > 9) return false;
    const value = this.values[i] === d ? 0 : d;
    return this.apply(i, { value, candidates: 0 });
  }

  /**
   * Candidate mode entry. Ignored on a cell that holds a value.
   * @param {number} i
   * @param {number} d 1-9
   */
  toggleCandidate(i, d) {
    if (!this.canEdit(i) || this.values[i] || d < 1 || d > 9) return false;
    return this.apply(i, { value: 0, candidates: this.candidates[i] ^ bit(d) });
  }

  /** @param {number} i */
  clear(i) {
    if (!this.canEdit(i)) return false;
    return this.apply(i, { value: 0, candidates: 0 });
  }

  undo() {
    const m = this.history.at(-1);
    if (this.status !== "playing" || !m) return null;
    this.history.pop();
    this.future.push(m);
    this.put(m.cell, m.before);
    return m.cell;
  }

  redo() {
    const m = this.future.at(-1);
    if (this.status !== "playing" || !m) return null;
    this.future.pop();
    this.history.push(m);
    this.put(m.cell, m.after);
    return m.cell;
  }

  /** @returns {Set<number>} */
  conflicts() {
    return findConflicts(this.values);
  }

  /** Cells with only candidates count as empty. */
  isFull() {
    return this.values.every((v) => v !== 0);
  }

  isSolved() {
    return this.values.every((v, i) => v === this.solution[i]);
  }

  /**
   * Player values that differ from the solution. Never reveals empty cells.
   * A check with mistakes makes the result "assisted".
   * @returns {number[]}
   */
  check() {
    const wrong = [];
    for (let i = 0; i < CELLS; i++) {
      if (!this.isGiven(i) && this.values[i] && this.values[i] !== this.solution[i]) wrong.push(i);
    }
    if (wrong.length) this.assisted = true;
    return wrong;
  }

  /** @param {PauseReason} reason */
  pause(reason) {
    if (this.status !== "playing") return false;
    this.status = "paused";
    this.pauseReason = reason;
    this.timer.stop();
    return true;
  }

  /**
   * A visible page resumes only a pause caused by hiding (FR-024).
   * @param {PauseReason} reason
   */
  resume(reason) {
    if (this.status !== "paused") return false;
    if (reason === "hidden" && this.pauseReason !== "hidden") return false;
    this.status = "playing";
    this.pauseReason = null;
    this.timer.start();
    return true;
  }

  /** Saved form (contracts/storage.md `ws:v1:game`); undo history is not kept. */
  toJSON() {
    return {
      puzzleId: this.puzzleId,
      values: [...this.values],
      candidates: [...this.candidates],
      elapsedMs: this.elapsedMs,
      status: this.status,
      assisted: this.assisted,
      savedAt: new Date().toISOString(),
    };
  }

  /**
   * Rebuild a saved game. Returns null when the save does not match the
   * puzzle. A restored unsolved game starts paused with reason "hidden",
   * so the caller resumes it once the page is visible.
   * @param {any} saved
   * @param {ConstructorParameters<typeof Game>[0]} puzzle
   */
  static restore(saved, puzzle) {
    if (!saved || saved.puzzleId !== puzzle.puzzleId) return null;
    const { values, candidates, elapsedMs, status, assisted } = saved;
    const okArray = (/** @type {unknown} */ a, /** @type {number} */ max) =>
      Array.isArray(a) && a.length === CELLS &&
      a.every((x) => Number.isInteger(x) && x >= 0 && x <= max);
    if (!okArray(values, 9) || !okArray(candidates, 0x1ff)) return null;
    if (puzzle.givens.some((g, i) => g !== 0 && values[i] !== g)) return null;
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;
    if (!["playing", "paused", "solved"].includes(status)) return null;

    const game = new Game(puzzle);
    game.values = [...values];
    game.candidates = values.map((/** @type {number} */ v, /** @type {number} */ i) =>
      (v ? 0 : candidates[i]));
    game.assisted = assisted === true;
    game.timer.stop();
    game.timer.set(elapsedMs);
    if (status === "solved" && game.isSolved()) {
      game.status = "solved";
    } else {
      game.status = "paused";
      game.pauseReason = "hidden";
    }
    return game;
  }
}
