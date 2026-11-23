import { describe, expect, it } from "vitest";
import { parseGrid } from "../../web/js/core/grid.js";
import { countSolutions, solve } from "../../web/js/core/solver.js";
import { EASY, EASY_SOLUTION, HARD17 } from "./fixtures.js";

describe("solver", () => {
  it("solves a known puzzle", () => {
    expect(solve(parseGrid(EASY))?.join("")).toBe(EASY_SOLUTION);
  });

  it("counts 0, 1 and 2+ solutions", () => {
    expect(countSolutions(parseGrid(EASY))).toBe(1);
    const broken = parseGrid(EASY);
    broken[2] = 5;
    expect(countSolutions(broken)).toBe(0);
    const open = parseGrid(EASY);
    for (let i = 0; i < 81; i++) if (i % 2) open[i] = 0;
    expect(countSolutions(open, 2)).toBe(2);
    expect(countSolutions(new Array(81).fill(0), 2)).toBe(2);
  });

  it("solves a 17-clue puzzle in under 5 ms on average", () => {
    const g = parseGrid(HARD17);
    solve(g);
    const runs = 20;
    const t = performance.now();
    for (let k = 0; k < runs; k++) solve(g);
    expect((performance.now() - t) / runs).toBeLessThan(5);
  });

  it("fills an empty grid randomly with a valid solution", () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const full = solve(new Array(81).fill(0), rnd);
    expect(full).not.toBeNull();
    expect(countSolutions(/** @type {number[]} */ (full))).toBe(1);
  });
});
