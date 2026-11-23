import { describe, expect, it } from "vitest";
import { Game } from "../../web/js/core/game.js";
import { parseGrid } from "../../web/js/core/grid.js";
import { EASY, EASY_SOLUTION } from "./fixtures.js";
import { EMPTY, fakeClock, newGame } from "./helpers.js";

const puzzle = (now = fakeClock()) => ({
  puzzleId: 100001, level: 1, givens: parseGrid(EASY), solution: parseGrid(EASY_SOLUTION), now,
});

describe("save and restore", () => {
  it("round-trips values, candidates, time and assisted", () => {
    const now = fakeClock();
    const g = newGame(now);
    g.setValue(EMPTY, 9);
    g.toggleCandidate(3, 6);
    g.check();
    now.advance(42_000);
    const saved = JSON.parse(JSON.stringify(g.toJSON()));
    const r = Game.restore(saved, puzzle());
    expect(r?.values).toEqual(g.values);
    expect(r?.candidates).toEqual(g.candidates);
    expect(r?.elapsedMs).toBe(42_000);
    expect(r?.assisted).toBe(true);
    expect(r?.history).toEqual([]);
  });

  it("restores a playing game as paused until the page is visible", () => {
    const now = fakeClock();
    const r = Game.restore(newGame().toJSON(), puzzle(now));
    expect(r?.status).toBe("paused");
    expect(r?.pauseReason).toBe("hidden");
    now.advance(5000);
    expect(r?.elapsedMs).toBe(0);
    r?.resume("hidden");
    now.advance(1000);
    expect(r?.elapsedMs).toBe(1000);
  });

  it("rejects a save whose givens do not match", () => {
    const saved = newGame().toJSON();
    saved.values[0] = 1;
    expect(Game.restore(saved, puzzle())).toBeNull();
  });

  it("rejects a save for another puzzle or with bad data", () => {
    const saved = newGame().toJSON();
    expect(Game.restore({ ...saved, puzzleId: 100002 }, puzzle())).toBeNull();
    expect(Game.restore({ ...saved, values: [1, 2] }, puzzle())).toBeNull();
    expect(Game.restore({ ...saved, status: "weird" }, puzzle())).toBeNull();
    expect(Game.restore(null, puzzle())).toBeNull();
  });

  it("keeps a solved game solved", () => {
    const g = newGame();
    parseGrid(EASY_SOLUTION).forEach((d, i) => { if (!g.isGiven(i)) g.setValue(i, d); });
    expect(Game.restore(g.toJSON(), puzzle())?.status).toBe("solved");
  });
});
