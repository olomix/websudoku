import { describe, expect, it } from "vitest";
import { EMPTY, newGame } from "./helpers.js";

const bit = (d) => 1 << (d - 1);

describe("candidates", () => {
  it("toggles candidates on and off", () => {
    const g = newGame();
    for (const d of [2, 5, 7]) g.toggleCandidate(EMPTY, d);
    expect(g.candidates[EMPTY]).toBe(bit(2) | bit(5) | bit(7));
    g.toggleCandidate(EMPTY, 5);
    expect(g.candidates[EMPTY]).toBe(bit(2) | bit(7));
  });

  it("is ignored on a cell with a value and on a given", () => {
    const g = newGame();
    g.setValue(EMPTY, 4);
    expect(g.toggleCandidate(EMPTY, 3)).toBe(false);
    expect(g.toggleCandidate(0, 3)).toBe(false);
  });

  it("is cleared by a value in one undo step", () => {
    const g = newGame();
    g.toggleCandidate(EMPTY, 2);
    g.toggleCandidate(EMPTY, 5);
    g.setValue(EMPTY, 5);
    expect(g.candidates[EMPTY]).toBe(0);
    g.undo();
    expect(g.values[EMPTY]).toBe(0);
    expect(g.candidates[EMPTY]).toBe(bit(2) | bit(5));
    g.undo();
    expect(g.candidates[EMPTY]).toBe(bit(2));
  });

  it("counts a candidate-only cell as empty", () => {
    const g = newGame();
    g.toggleCandidate(EMPTY, 4);
    expect(g.values[EMPTY]).toBe(0);
    expect(g.isFull()).toBe(false);
  });
});
