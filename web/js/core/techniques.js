// @ts-check
/**
 * Human-style solving techniques used to grade puzzles (research R3).
 * Each technique makes at most one kind of deduction per call and returns
 * true if it placed a digit or removed a candidate.
 */
import { BOXES, CELLS, COLS, PEERS, ROWS, UNITS, arePeers, boxOf, colOf, rowOf } from "./grid.js";
import { popcount } from "./solver.js";

/**
 * @typedef {object} SolveState
 * @property {Uint8Array} values 0 = empty
 * @property {Uint16Array} cands bit d-1 = candidate d; 0 for filled cells
 */

const bit = (/** @type {number} */ d) => 1 << (d - 1);

/** @param {number} m */
function digitsOf(m) {
  const out = [];
  for (let d = 1; d <= 9; d++) if (m & bit(d)) out.push(d);
  return out;
}

/**
 * All k-element combinations of `items`.
 * @template T
 * @param {T[]} items
 * @param {number} k
 * @returns {T[][]}
 */
function combinations(items, k) {
  /** @type {T[][]} */
  const out = [];
  /** @type {T[]} */
  const cur = [];
  const rec = (/** @type {number} */ start) => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      cur.push(items[i]);
      rec(i + 1);
      cur.pop();
    }
  };
  rec(0);
  return out;
}

/**
 * Build the candidate state from a grid of values.
 * @param {ArrayLike<number>} values
 * @returns {SolveState}
 */
export function createState(values) {
  const v = Uint8Array.from(values);
  const cands = new Uint16Array(CELLS);
  for (let i = 0; i < CELLS; i++) {
    if (v[i]) continue;
    let m = 0x1ff;
    for (const p of PEERS[i]) if (v[p]) m &= ~bit(v[p]);
    cands[i] = m;
  }
  return { values: v, cands };
}

/** @param {SolveState} s @param {number} i @param {number} d */
export function place(s, i, d) {
  s.values[i] = d;
  s.cands[i] = 0;
  for (const p of PEERS[i]) s.cands[p] &= ~bit(d);
}

/** @param {SolveState} s */
export const isSolved = (s) => s.values.every((v) => v !== 0);

/**
 * Remove `mask` from each cell; true if anything changed.
 * @param {SolveState} s @param {Iterable<number>} cells @param {number} mask
 */
function eliminate(s, cells, mask) {
  let changed = false;
  for (const i of cells) {
    if (s.cands[i] & mask) {
      s.cands[i] &= ~mask;
      changed = true;
    }
  }
  return changed;
}

/** @param {SolveState} s */
export function nakedSingle(s) {
  for (let i = 0; i < CELLS; i++) {
    if (!s.values[i] && popcount(s.cands[i]) === 1) {
      place(s, i, digitsOf(s.cands[i])[0]);
      return true;
    }
  }
  return false;
}

/** @param {SolveState} s */
export function hiddenSingle(s) {
  for (const unit of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const cells = unit.filter((i) => s.cands[i] & bit(d));
      if (cells.length === 1) {
        place(s, cells[0], d);
        return true;
      }
    }
  }
  return false;
}

/** Pointing (box → line) and claiming (line → box). @param {SolveState} s */
export function lockedCandidates(s) {
  for (let d = 1; d <= 9; d++) {
    const b = bit(d);
    for (const box of BOXES) {
      const cells = box.filter((i) => s.cands[i] & b);
      if (cells.length < 2) continue;
      const r = rowOf(cells[0]);
      if (cells.every((i) => rowOf(i) === r) &&
          eliminate(s, ROWS[r].filter((i) => !box.includes(i)), b)) return true;
      const c = colOf(cells[0]);
      if (cells.every((i) => colOf(i) === c) &&
          eliminate(s, COLS[c].filter((i) => !box.includes(i)), b)) return true;
    }
    for (const line of [...ROWS, ...COLS]) {
      const cells = line.filter((i) => s.cands[i] & b);
      if (cells.length < 2) continue;
      const bx = boxOf(cells[0]);
      if (cells.every((i) => boxOf(i) === bx) &&
          eliminate(s, BOXES[bx].filter((i) => !line.includes(i)), b)) return true;
    }
  }
  return false;
}

/** @param {number} k */
function nakedSubset(k) {
  return (/** @type {SolveState} */ s) => {
    for (const unit of UNITS) {
      const open = unit.filter((i) => {
        const n = popcount(s.cands[i]);
        return n >= 2 && n <= k;
      });
      if (open.length < k) continue;
      for (const combo of combinations(open, k)) {
        const union = combo.reduce((m, i) => m | s.cands[i], 0);
        if (popcount(union) !== k) continue;
        const others = unit.filter((i) => !combo.includes(i));
        if (eliminate(s, others, union)) return true;
      }
    }
    return false;
  };
}

/** @param {number} k */
function hiddenSubset(k) {
  return (/** @type {SolveState} */ s) => {
    for (const unit of UNITS) {
      const free = unit.reduce((m, i) => m | s.cands[i], 0);
      const digits = digitsOf(free);
      if (digits.length <= k) continue;
      for (const combo of combinations(digits, k)) {
        const mask = combo.reduce((m, d) => m | bit(d), 0);
        const cells = unit.filter((i) => s.cands[i] & mask);
        if (cells.length !== k) continue;
        if (eliminate(s, cells, 0x1ff & ~mask)) return true;
      }
    }
    return false;
  };
}

/** X-Wing (n=2), Swordfish (n=3). @param {number} n */
function fish(n) {
  return (/** @type {SolveState} */ s) => {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      for (const [base, cover, pos] of /** @type {const} */ ([[ROWS, COLS, colOf], [COLS, ROWS, rowOf]])) {
        const lines = [];
        for (const line of base) {
          const where = line.filter((i) => s.cands[i] & b).map(pos);
          if (where.length >= 2 && where.length <= n) lines.push({ line, where });
        }
        for (const combo of combinations(lines, n)) {
          const coverIdx = new Set(combo.flatMap((l) => l.where));
          if (coverIdx.size !== n) continue;
          const baseCells = new Set(combo.flatMap((l) => l.line));
          const targets = [...coverIdx].flatMap((c) => cover[c]).filter((i) => !baseCells.has(i));
          if (eliminate(s, targets, b)) return true;
        }
      }
    }
    return false;
  };
}

/** @param {SolveState} s */
export function xyWing(s) {
  const bivalue = [];
  for (let i = 0; i < CELLS; i++) if (popcount(s.cands[i]) === 2) bivalue.push(i);
  for (const pivot of bivalue) {
    const pm = s.cands[pivot];
    const wings = bivalue.filter((w) => w !== pivot && arePeers(w, pivot) &&
      popcount(s.cands[w] & pm) === 1);
    for (const [w1, w2] of combinations(wings, 2)) {
      const m1 = s.cands[w1];
      const m2 = s.cands[w2];
      const z = m1 & m2 & ~pm;
      if (popcount(z) !== 1 || (m1 & pm) === (m2 & pm)) continue;
      const targets = [];
      for (let i = 0; i < CELLS; i++) {
        if (i !== w1 && i !== w2 && arePeers(i, w1) && arePeers(i, w2)) targets.push(i);
      }
      if (eliminate(s, targets, z)) return true;
    }
  }
  return false;
}

/** @param {SolveState} s */
export function xyzWing(s) {
  for (let pivot = 0; pivot < CELLS; pivot++) {
    const pm = s.cands[pivot];
    if (popcount(pm) !== 3) continue;
    const wings = PEERS[pivot].filter((w) =>
      popcount(s.cands[w]) === 2 && (s.cands[w] & ~pm) === 0);
    for (const [w1, w2] of combinations(wings, 2)) {
      const z = s.cands[w1] & s.cands[w2];
      if (popcount(z) !== 1 || s.cands[w1] === s.cands[w2]) continue;
      const targets = [];
      for (let i = 0; i < CELLS; i++) {
        if (i !== pivot && i !== w1 && i !== w2 &&
            arePeers(i, pivot) && arePeers(i, w1) && arePeers(i, w2)) targets.push(i);
      }
      if (eliminate(s, targets, z)) return true;
    }
  }
  return false;
}

/** Simple coloring: color wrap and color trap. @param {SolveState} s */
export function simpleColoring(s) {
  for (let d = 1; d <= 9; d++) {
    const b = bit(d);
    /** @type {Map<number, number[]>} */
    const links = new Map();
    for (const unit of UNITS) {
      const cells = unit.filter((i) => s.cands[i] & b);
      if (cells.length !== 2) continue;
      const [a, c] = cells;
      if (!links.has(a)) links.set(a, []);
      if (!links.has(c)) links.set(c, []);
      links.get(a)?.push(c);
      links.get(c)?.push(a);
    }
    /** @type {Map<number, number>} */
    const color = new Map();
    for (const start of links.keys()) {
      if (color.has(start)) continue;
      /** @type {number[][]} */
      const groups = [[], []];
      const stack = [start];
      color.set(start, 0);
      while (stack.length) {
        const i = /** @type {number} */ (stack.pop());
        const ci = /** @type {number} */ (color.get(i));
        groups[ci].push(i);
        for (const j of links.get(i) ?? []) {
          if (!color.has(j)) {
            color.set(j, 1 - ci);
            stack.push(j);
          }
        }
      }
      if (groups[0].length + groups[1].length < 4) continue;
      // Color wrap: two cells of one color see each other, so that color is false.
      for (const g of groups) {
        const clash = g.some((a, k) => g.slice(k + 1).some((c) => arePeers(a, c)));
        if (clash && eliminate(s, g, b)) return true;
      }
      // Color trap: a cell that sees both colors cannot hold d.
      const targets = [];
      for (let i = 0; i < CELLS; i++) {
        if (!(s.cands[i] & b) || color.has(i)) continue;
        if (groups[0].some((a) => arePeers(a, i)) && groups[1].some((c) => arePeers(c, i))) {
          targets.push(i);
        }
      }
      if (eliminate(s, targets, b)) return true;
    }
  }
  return false;
}

export const nakedPair = nakedSubset(2);
export const hiddenPair = hiddenSubset(2);
export const nakedTriple = nakedSubset(3);
export const hiddenTriple = hiddenSubset(3);
export const nakedQuad = nakedSubset(4);
export const hiddenQuad = hiddenSubset(4);
export const xWing = fish(2);
export const swordfish = fish(3);

/**
 * Technique ladder, easiest first. `level` is the lowest level allowed to
 * use the technique (research R3).
 * @type {{ name: string, level: 1 | 2 | 3 | 4, run: (s: SolveState) => boolean }[]}
 */
export const LADDER = [
  { name: "naked single", level: 1, run: nakedSingle },
  { name: "hidden single", level: 1, run: hiddenSingle },
  { name: "locked candidates", level: 2, run: lockedCandidates },
  { name: "naked pair", level: 2, run: nakedPair },
  { name: "hidden pair", level: 2, run: hiddenPair },
  { name: "naked triple", level: 3, run: nakedTriple },
  { name: "hidden triple", level: 3, run: hiddenTriple },
  { name: "naked quad", level: 3, run: nakedQuad },
  { name: "hidden quad", level: 3, run: hiddenQuad },
  { name: "x-wing", level: 3, run: xWing },
  { name: "swordfish", level: 4, run: swordfish },
  { name: "xy-wing", level: 4, run: xyWing },
  { name: "xyz-wing", level: 4, run: xyzWing },
  { name: "simple coloring", level: 4, run: simpleColoring },
];
