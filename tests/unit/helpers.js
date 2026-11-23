import { Game } from "../../web/js/core/game.js";
import { parseGrid } from "../../web/js/core/grid.js";
import { EASY, EASY_SOLUTION } from "./fixtures.js";

/** A fake monotonic clock the test can move forward. */
export function fakeClock() {
  let t = 0;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

export function newGame(now = fakeClock()) {
  return new Game({
    puzzleId: 100001, level: 1, givens: parseGrid(EASY), solution: parseGrid(EASY_SOLUTION), now,
  });
}

export const SOLUTION = parseGrid(EASY_SOLUTION);
/** First empty cell of EASY (index 2, solution 4). */
export const EMPTY = 2;
