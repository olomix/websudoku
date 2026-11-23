// @ts-check
/**
 * Puzzle generation and canonical form, shared by the catalog tool and tests.
 */
import { grade } from "../web/js/core/grader.js";
import { countSolutions, solve } from "../web/js/core/solver.js";

/** Givens range per level (research R3). */
export const GIVENS_RANGE = /** @type {const} */ ({
  1: [36, 40],
  2: [30, 35],
  3: [26, 31],
  4: [22, 28],
});

/**
 * Try to make one puzzle of the level. Removes cells in symmetric pairs
 * (180° rotation) while the solution stays unique.
 * @param {1 | 2 | 3 | 4} level
 * @param {() => number} random
 * @returns {string | null} 81-char givens, or null when this attempt failed
 */
export function attempt(level, random) {
  const [min, max] = GIVENS_RANGE[level];
  const grid = /** @type {number[]} */ (solve(new Array(81).fill(0), random));
  const order = [...Array(41).keys()];
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  let givens = 81;
  for (const i of order) {
    const pair = i === 40 ? [40] : [i, 80 - i];
    if (givens - pair.length < min) continue;
    const saved = pair.map((p) => grid[p]);
    for (const p of pair) grid[p] = 0;
    if (countSolutions(grid, 2) !== 1) {
      pair.forEach((p, k) => (grid[p] = saved[k]));
      continue;
    }
    givens -= pair.length;
    if (givens > max) continue;
    const g = grade(grid).level;
    if (g === level) return grid.join("");
    if (g === null || g > level) return null;
  }
  return null;
}

/** The 8 rotations and reflections, as index maps. */
const SYMMETRIES = (() => {
  const maps = [];
  const rot = (/** @type {number} */ i) => (i % 9) * 9 + (8 - Math.floor(i / 9));
  const flip = (/** @type {number} */ i) => Math.floor(i / 9) * 9 + (8 - (i % 9));
  let m = [...Array(81).keys()];
  for (let r = 0; r < 4; r++) {
    maps.push(m);
    maps.push(m.map(flip));
    m = m.map(rot);
  }
  return maps;
})();

/**
 * Same string for grids that differ only by rotation, reflection or digit
 * relabelling (contracts/catalog.md guarantee 4).
 * @param {string} givens
 */
export function canonical(givens) {
  let best = "";
  for (const map of SYMMETRIES) {
    /** @type {Record<string, string>} */
    const label = {};
    let next = 1;
    let out = "";
    for (let i = 0; i < 81; i++) {
      const ch = givens[map[i]];
      if (ch === "0") {
        out += "0";
        continue;
      }
      if (!label[ch]) label[ch] = String(next++);
      out += label[ch];
    }
    if (!best || out < best) best = out;
  }
  return best;
}
