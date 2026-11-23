// @ts-check
/**
 * Grade a puzzle by the hardest technique a human-style solve needs.
 */
import { LADDER, createState, isSolved } from "./techniques.js";

/**
 * @typedef {object} Grade
 * @property {1 | 2 | 3 | 4 | null} level null when the ladder cannot finish the puzzle
 * @property {string | null} hardest name of the hardest technique used
 * @property {Record<string, number>} uses how often each technique made progress
 */

/**
 * Apply techniques easiest first; after each deduction start again from the
 * easiest, so the result reflects the simplest path a person could take.
 * @param {ArrayLike<number>} givens
 * @returns {Grade}
 */
export function grade(givens) {
  const s = createState(givens);
  /** @type {Record<string, number>} */
  const uses = {};
  let rank = -1;
  while (!isSolved(s)) {
    const k = LADDER.findIndex((t) => t.run(s));
    if (k < 0) return { level: null, hardest: null, uses };
    uses[LADDER[k].name] = (uses[LADDER[k].name] ?? 0) + 1;
    rank = Math.max(rank, k);
  }
  if (rank < 0) return { level: 1, hardest: null, uses };
  return { level: LADDER[rank].level, hardest: LADDER[rank].name, uses };
}
