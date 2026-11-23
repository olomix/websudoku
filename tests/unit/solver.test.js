import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chunkName } from "../../web/js/core/catalog.js";
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

  it("solves shipped Evil puzzles in under 5 ms on average (plan: load-time solve)", () => {
    const sample = JSON.parse(readFileSync(
      new URL(`../../web/puzzles/${chunkName(4, 1)}`, import.meta.url), "utf8")).slice(0, 200);
    const grids = sample.map(parseGrid);
    grids.forEach((g) => solve(g));
    const t = performance.now();
    for (const g of grids) solve(g);
    expect((performance.now() - t) / grids.length).toBeLessThan(5);
  });

  // A worst case that never ships; the loose bound only catches a solver that
  // becomes much slower, so a slower CI machine does not fail it.
  it("solves a 17-clue puzzle in under 50 ms on average", () => {
    const g = parseGrid(HARD17);
    solve(g);
    const runs = 20;
    const t = performance.now();
    for (let k = 0; k < runs; k++) solve(g);
    expect((performance.now() - t) / runs).toBeLessThan(50);
  });

  it("fills an empty grid randomly with a valid solution", () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const full = solve(new Array(81).fill(0), rnd);
    expect(full).not.toBeNull();
    expect(countSolutions(/** @type {number[]} */ (full))).toBe(1);
  });
});
