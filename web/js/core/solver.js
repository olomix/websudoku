// @ts-check
/**
 * Fast backtracking solver over candidate bit masks (bit d-1 = digit d).
 */
import { CELLS } from "./grid.js";

const ALL = 0x1ff;

/** @param {number} m */
export function popcount(m) {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
}

const ROW = Array.from({ length: CELLS }, (_, i) => Math.floor(i / 9));
const COL = Array.from({ length: CELLS }, (_, i) => i % 9);
const BOX = Array.from({ length: CELLS }, (_, i) =>
  Math.floor(ROW[i] / 3) * 3 + Math.floor(COL[i] / 3));

/**
 * Search state: the grid plus used-digit masks per row, column and box.
 * @typedef {{ grid: Uint8Array, rows: Uint16Array, cols: Uint16Array, boxes: Uint16Array }} State
 */

/**
 * Build the start state, or null when the givens break a rule.
 * @param {ArrayLike<number>} values
 * @returns {State | null}
 */
function initState(values) {
  const st = {
    grid: new Uint8Array(CELLS),
    rows: new Uint16Array(9),
    cols: new Uint16Array(9),
    boxes: new Uint16Array(9),
  };
  for (let i = 0; i < CELLS; i++) {
    const v = values[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    if ((st.rows[ROW[i]] | st.cols[COL[i]] | st.boxes[BOX[i]]) & bit) return null;
    st.grid[i] = v;
    st.rows[ROW[i]] |= bit;
    st.cols[COL[i]] |= bit;
    st.boxes[BOX[i]] |= bit;
  }
  return st;
}

/**
 * Depth-first search. Calls `onSolution` for each solution; stops when it
 * returns true.
 * @param {State} st
 * @param {(grid: Uint8Array) => boolean} onSolution
 * @param {() => number} [random] when given, digits are tried in random order
 * @returns {boolean}
 */
function search(st, onSolution, random) {
  const { grid, rows, cols, boxes } = st;
  // Pick the empty cell with the fewest options (MRV).
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < CELLS; i++) {
    if (grid[i]) continue;
    const m = ALL & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
    const n = popcount(m);
    if (n < bestCount) {
      best = i;
      bestMask = m;
      bestCount = n;
      if (n <= 1) break;
    }
  }
  if (best < 0) return onSolution(grid);
  if (bestCount === 0) return false;

  const digits = [];
  for (let d = 1; d <= 9; d++) if (bestMask & (1 << (d - 1))) digits.push(d);
  if (random) {
    for (let k = digits.length - 1; k > 0; k--) {
      const j = Math.floor(random() * (k + 1));
      [digits[k], digits[j]] = [digits[j], digits[k]];
    }
  }
  const r = ROW[best];
  const c = COL[best];
  const b = BOX[best];
  for (const d of digits) {
    const bit = 1 << (d - 1);
    grid[best] = d;
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
    const done = search(st, onSolution, random);
    rows[r] &= ~bit;
    cols[c] &= ~bit;
    boxes[b] &= ~bit;
    if (done) return true;
  }
  grid[best] = 0;
  return false;
}

/**
 * Count solutions, stopping at `limit`.
 * @param {ArrayLike<number>} values 0 = empty
 * @param {number} [limit]
 */
export function countSolutions(values, limit = 2) {
  const st = initState(values);
  if (!st) return 0;
  let count = 0;
  search(st, () => ++count >= limit);
  return count;
}

/**
 * The first solution found, or null.
 * @param {ArrayLike<number>} values
 * @param {() => number} [random] randomize digit order (for generating grids)
 * @returns {number[] | null}
 */
export function solve(values, random) {
  const st = initState(values);
  if (!st) return null;
  /** @type {number[] | null} */
  let out = null;
  search(st, (g) => {
    out = Array.from(g);
    return true;
  }, random);
  return out;
}
