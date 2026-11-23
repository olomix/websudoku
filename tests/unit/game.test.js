import { describe, expect, it } from "vitest";
import { EMPTY, SOLUTION, newGame } from "./helpers.js";

describe("game values", () => {
  it("never changes a given cell", () => {
    const g = newGame();
    expect(g.setValue(0, 1)).toBe(false);
    expect(g.clear(0)).toBe(false);
    expect(g.values[0]).toBe(5);
  });

  it("sets, toggles off and clears a value", () => {
    const g = newGame();
    expect(g.setValue(EMPTY, 7)).toBe(true);
    expect(g.values[EMPTY]).toBe(7);
    g.setValue(EMPTY, 7);
    expect(g.values[EMPTY]).toBe(0);
    g.setValue(EMPTY, 4);
    g.clear(EMPTY);
    expect(g.values[EMPTY]).toBe(0);
  });

  it("ignores digits out of range", () => {
    const g = newGame();
    expect(g.setValue(EMPTY, 0)).toBe(false);
    expect(g.setValue(EMPTY, 10)).toBe(false);
  });

  it("undoes and redoes one step per action, back to the start state only", () => {
    const g = newGame();
    g.setValue(EMPTY, 1);
    g.setValue(EMPTY, 2);
    expect(g.undo()).toBe(EMPTY);
    expect(g.values[EMPTY]).toBe(1);
    expect(g.undo()).toBe(EMPTY);
    expect(g.values[EMPTY]).toBe(0);
    expect(g.undo()).toBeNull();
    expect(g.redo()).toBe(EMPTY);
    expect(g.values[EMPTY]).toBe(1);
    g.setValue(3, 6);
    expect(g.redo()).toBeNull();
  });

  it("lists conflicting cells", () => {
    const g = newGame();
    g.setValue(EMPTY, 5); // the 5 at index 0 is in the same row and box
    expect([...g.conflicts()].sort((a, b) => a - b)).toEqual([0, EMPTY]);
  });

  it("becomes solved when every cell is correct and then ignores input", () => {
    const g = newGame();
    SOLUTION.forEach((d, i) => { if (!g.isGiven(i)) g.setValue(i, d); });
    expect(g.status).toBe("solved");
    expect(g.isFull()).toBe(true);
    expect(g.setValue(EMPTY, 1)).toBe(false);
    expect(g.undo()).toBeNull();
  });

  it("is full but not solved when a value is wrong", () => {
    const h = newGame();
    SOLUTION.forEach((d, i) => { if (!h.isGiven(i)) h.setValue(i, i === EMPTY ? 9 : d); });
    expect(h.isFull()).toBe(true);
    expect(h.status).toBe("playing");
  });
});
