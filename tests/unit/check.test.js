import { describe, expect, it } from "vitest";
import { EMPTY, newGame } from "./helpers.js";

describe("check", () => {
  it("lists only wrong player values", () => {
    const g = newGame();
    g.setValue(EMPTY, 9); // solution is 4
    g.setValue(3, 6); // correct
    expect(g.check()).toEqual([EMPTY]);
  });

  it("never reports empty cells or givens", () => {
    const g = newGame();
    expect(g.check()).toEqual([]);
    g.toggleCandidate(EMPTY, 1);
    expect(g.check()).toEqual([]);
  });

  it("marks the game assisted only after a check finds mistakes", () => {
    const g = newGame();
    g.setValue(3, 6);
    g.check();
    expect(g.assisted).toBe(false);
    g.setValue(EMPTY, 9);
    g.check();
    expect(g.assisted).toBe(true);
    g.clear(EMPTY);
    g.check();
    expect(g.assisted).toBe(true);
  });
});
