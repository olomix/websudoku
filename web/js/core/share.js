// @ts-check
/**
 * Links, results and the share text (contracts/ui.md).
 */
import { LEVELS } from "./catalog.js";
import { formatTime } from "./timer.js";

/**
 * @typedef {object} Result
 * @property {number} puzzleId
 * @property {1|2|3|4} level
 * @property {number} timeMs
 * @property {"clean" | "assisted"} label
 * @property {string} date ISO date (YYYY-MM-DD)
 */

/**
 * Link to a puzzle on the current page's origin and path.
 * @param {number} id
 * @param {{ origin: string, pathname: string }} [loc]
 */
export function puzzleLink(id, loc = globalThis.location) {
  return `${loc.origin}${loc.pathname}?id=${id}`;
}

/**
 * @param {{ puzzleId: number, level: 1|2|3|4, elapsedMs: number, assisted: boolean }} game
 * @param {Date} [now]
 * @returns {Result}
 */
export function buildResult(game, now = new Date()) {
  return {
    puzzleId: game.puzzleId,
    level: game.level,
    timeMs: game.elapsedMs,
    label: game.assisted ? "assisted" : "clean",
    date: now.toISOString().slice(0, 10),
  };
}

/**
 * @param {Result} r
 * @param {string} link
 */
export function shareText(r, link) {
  return `Sudoku #${r.puzzleId} (${LEVELS[r.level]}) — solved in ${formatTime(r.timeMs)}, ${r.label}\n${link}`;
}

/**
 * Must run inside the click handler: Safari allows clipboard writes only
 * during a user gesture (research R10).
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
