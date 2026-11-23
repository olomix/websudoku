// @ts-check
/**
 * Grid geometry and conflict rules. Cells are 0–80, row-major.
 */

export const SIZE = 9;
export const CELLS = 81;

/** @param {number} i */
export const rowOf = (i) => Math.floor(i / SIZE);
/** @param {number} i */
export const colOf = (i) => i % SIZE;
/** @param {number} i */
export const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
/** @param {number} r @param {number} c */
export const indexOf = (r, c) => r * SIZE + c;

/** Cell indexes of each row, column and box (27 units). */
export const ROWS = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => indexOf(r, c)));
export const COLS = Array.from({ length: 9 }, (_, c) =>
  Array.from({ length: 9 }, (_, r) => indexOf(r, c)));
export const BOXES = Array.from({ length: 9 }, (_, b) =>
  Array.from({ length: 9 }, (_, k) =>
    indexOf(Math.floor(b / 3) * 3 + Math.floor(k / 3), (b % 3) * 3 + (k % 3))));
export const UNITS = [...ROWS, ...COLS, ...BOXES];

/** The 20 other cells that share a row, column or box with each cell. */
export const PEERS = Array.from({ length: CELLS }, (_, i) => {
  const set = new Set([...ROWS[rowOf(i)], ...COLS[colOf(i)], ...BOXES[boxOf(i)]]);
  set.delete(i);
  return [...set];
});

/** @param {number} a @param {number} b */
export const arePeers = (a, b) =>
  a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));

/**
 * Cells whose value repeats in one of their units.
 * @param {ArrayLike<number>} values 0 = empty
 * @returns {Set<number>}
 */
export function findConflicts(values) {
  const out = new Set();
  for (let i = 0; i < CELLS; i++) {
    const v = values[i];
    if (!v) continue;
    for (const p of PEERS[i]) {
      if (values[p] === v) {
        out.add(i);
        break;
      }
    }
  }
  return out;
}

/**
 * @param {string} s 81 chars, `0` or `.` = empty
 * @returns {number[]}
 */
export function parseGrid(s) {
  if (typeof s !== "string" || s.length !== CELLS || !/^[0-9.]+$/.test(s)) {
    throw new Error("grid must be 81 characters of 0-9");
  }
  return [...s].map((ch) => (ch === "." ? 0 : Number(ch)));
}

/** @param {ArrayLike<number>} values */
export const formatGrid = (values) => Array.from(values).join("");
