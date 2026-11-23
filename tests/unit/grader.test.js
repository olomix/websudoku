import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { indexOf, parseGrid } from "../../web/js/core/grid.js";
import { grade } from "../../web/js/core/grader.js";
import { solve } from "../../web/js/core/solver.js";
import * as T from "../../web/js/core/techniques.js";
import { EASY, HARD17 } from "./fixtures.js";

const bit = (d) => 1 << (d - 1);
const mask = (...ds) => ds.reduce((m, d) => m | bit(d), 0);

/**
 * A state where every cell is filled except the ones given in `open`.
 * Filled cells hold 0 candidates, so only the crafted cells matter.
 */
function crafted(open) {
  const s = { values: new Uint8Array(81).fill(9), cands: new Uint16Array(81) };
  for (const [[r, c], m] of open) {
    s.values[indexOf(r, c)] = 0;
    s.cands[indexOf(r, c)] = m;
  }
  return s;
}
const has = (s, r, c, d) => Boolean(s.cands[indexOf(r, c)] & bit(d));
const at = (s, r, c) => s.cands[indexOf(r, c)];

describe("techniques", () => {
  it("naked single places the only candidate", () => {
    const s = crafted([[[0, 0], mask(4)], [[0, 1], mask(4, 5)]]);
    expect(T.nakedSingle(s)).toBe(true);
    expect(s.values[0]).toBe(4);
    expect(has(s, 0, 1, 4)).toBe(false);
  });

  it("hidden single places a digit with one spot in a unit", () => {
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 1], mask(2, 3)], [[0, 2], mask(2, 3)]]);
    expect(T.hiddenSingle(s)).toBe(true);
    expect(s.values[0]).toBe(1);
  });

  it("locked candidates (pointing) clear the rest of the row", () => {
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 1], mask(1, 3)], [[0, 5], mask(1, 4)],
      [[1, 0], mask(2, 3)]]);
    expect(T.lockedCandidates(s)).toBe(true);
    expect(has(s, 0, 5, 1)).toBe(false);
  });

  it("locked candidates (claiming) clear the rest of the box", () => {
    // Digit 1 in row 0 only in box 0; box 0 also has 1 at (2,2).
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 1], mask(1, 3)], [[2, 2], mask(1, 4)],
      [[0, 6], mask(5, 6)]]);
    expect(T.lockedCandidates(s)).toBe(true);
    expect(has(s, 2, 2, 1)).toBe(false);
  });

  it("naked pair clears its digits from the unit", () => {
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 4], mask(1, 2)], [[0, 8], mask(1, 2, 3)]]);
    expect(T.nakedPair(s)).toBe(true);
    expect(s.cands[indexOf(0, 8)]).toBe(mask(3));
    expect(at(s, 0, 0)).toBe(mask(1, 2));
  });

  it("hidden pair clears other digits from its cells", () => {
    const s = crafted([[[0, 0], mask(1, 2, 3)], [[0, 4], mask(1, 2, 4)], [[0, 8], mask(3, 4)],
      [[0, 6], mask(3, 4)]]);
    expect(T.hiddenPair(s)).toBe(true);
    expect(s.cands[indexOf(0, 0)] & ~mask(1, 2)).toBe(0);
  });

  it("naked triple clears its digits from the unit", () => {
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 3], mask(2, 3)], [[0, 6], mask(1, 3)],
      [[0, 8], mask(1, 4)]]);
    expect(T.nakedTriple(s)).toBe(true);
    expect(s.cands[indexOf(0, 8)]).toBe(mask(4));
  });

  it("hidden triple clears other digits from its three cells", () => {
    const rest = mask(4, 5, 6, 7, 8, 9);
    const s = crafted([[[0, 0], mask(1, 2, 5)], [[0, 3], mask(2, 3, 6)], [[0, 6], mask(1, 3, 7)],
      ...[1, 2, 4, 5, 7, 8].map((c) => [[0, c], rest])]);
    expect(T.hiddenTriple(s)).toBe(true);
    expect(at(s, 0, 0)).toBe(mask(1, 2));
    expect(at(s, 0, 3)).toBe(mask(2, 3));
    expect(at(s, 0, 6)).toBe(mask(1, 3));
    expect(at(s, 0, 1)).toBe(rest);
  });

  it("naked quad clears its digits from the unit", () => {
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 2], mask(2, 3)], [[0, 4], mask(3, 4)],
      [[0, 6], mask(1, 4)], [[0, 8], mask(1, 5)]]);
    expect(T.nakedQuad(s)).toBe(true);
    expect(at(s, 0, 8)).toBe(mask(5));
    expect(at(s, 0, 4)).toBe(mask(3, 4));
  });

  it("hidden quad clears other digits from its four cells", () => {
    const rest = mask(5, 6, 7, 8, 9);
    const s = crafted([[[0, 0], mask(1, 2, 6)], [[0, 2], mask(2, 3, 7)], [[0, 4], mask(3, 4, 8)],
      [[0, 6], mask(1, 4, 9)], ...[1, 3, 5, 7, 8].map((c) => [[0, c], rest])]);
    expect(T.hiddenQuad(s)).toBe(true);
    expect(at(s, 0, 0)).toBe(mask(1, 2));
    expect(at(s, 0, 6)).toBe(mask(1, 4));
    expect(at(s, 0, 1)).toBe(rest);
  });

  it("x-wing clears the digit from the cover columns", () => {
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 4], mask(1, 3)], [[4, 0], mask(1, 2)],
      [[4, 4], mask(1, 3)], [[7, 0], mask(1, 5)]]);
    expect(T.xWing(s)).toBe(true);
    expect(has(s, 7, 0, 1)).toBe(false);
    for (const [r, c] of [[0, 0], [0, 4], [4, 0], [4, 4]]) expect(has(s, r, c, 1)).toBe(true);
  });

  it("swordfish clears the digit from three cover columns", () => {
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 3], mask(1, 2)], [[3, 3], mask(1, 2)],
      [[3, 6], mask(1, 2)], [[6, 0], mask(1, 2)], [[6, 6], mask(1, 2)], [[8, 6], mask(1, 5)]]);
    expect(T.swordfish(s)).toBe(true);
    expect(has(s, 8, 6, 1)).toBe(false);
  });

  it("xy-wing clears the shared digit seen by both wings", () => {
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 4], mask(1, 3)], [[4, 0], mask(2, 3)],
      [[4, 4], mask(3, 5)]]);
    expect(T.xyWing(s)).toBe(true);
    expect(has(s, 4, 4, 3)).toBe(false);
  });

  it("xyz-wing clears the digit seen by pivot and both wings", () => {
    const s = crafted([[[0, 0], mask(1, 2, 3)], [[0, 4], mask(1, 3)], [[1, 1], mask(2, 3)],
      [[0, 2], mask(3, 6)]]);
    expect(T.xyzWing(s)).toBe(true);
    expect(has(s, 0, 2, 3)).toBe(false);
  });

  it("simple coloring removes a digit that sees both colors", () => {
    // Chain A(0,0)-B(0,4)-C(4,4)-D(4,1); (3,0) sees A and D.
    const s = crafted([[[0, 0], mask(1, 2)], [[0, 4], mask(1, 2)], [[4, 4], mask(1, 2)],
      [[4, 1], mask(1, 2)], [[3, 0], mask(1, 3)], [[7, 0], mask(1, 3)], [[5, 2], mask(1, 3)]]);
    expect(T.simpleColoring(s)).toBe(true);
    expect(has(s, 3, 0, 1)).toBe(false);
    for (const [r, c] of [[0, 0], [0, 4], [4, 4], [4, 1]]) expect(has(s, r, c, 1)).toBe(true);
  });

  it("simple coloring (wrap) removes a color whose cells see each other", () => {
    // Chain A(3,0)-B(8,0)-C(8,4)-D(5,4)-E(3,5): A, C, E share a color and A, E
    // share row 3, which also holds X(3,8), so that color is false.
    const s = crafted([[[3, 0], mask(1, 2)], [[8, 0], mask(1, 2)], [[8, 4], mask(1, 2)],
      [[5, 4], mask(1, 2)], [[3, 5], mask(1, 2)], [[3, 8], mask(1, 3)]]);
    expect(T.simpleColoring(s)).toBe(true);
    for (const [r, c] of [[3, 0], [8, 4], [3, 5]]) expect(has(s, r, c, 1)).toBe(false);
    for (const [r, c] of [[8, 0], [5, 4]]) expect(has(s, r, c, 1)).toBe(true);
  });
});

describe("grader", () => {
  it("grades a singles-only puzzle as Easy", () => {
    expect(grade(parseGrid(EASY)).level).toBe(1);
  });

  it("returns null level when the ladder cannot finish", () => {
    expect(grade(new Array(81).fill(0)).level).toBe(null);
  });

  it("never removes the true digit (soundness)", () => {
    // Catalog samples from Moderate to Evil exercise every technique, not
    // only the singles that EASY and HARD17 need.
    const sample = [2, 3, 4].flatMap((l) => JSON.parse(
      readFileSync(new URL(`../../web/puzzles/level-${l}.json`, import.meta.url), "utf8")).slice(0, 60));
    const used = new Set();
    for (const p of [EASY, HARD17, ...sample]) {
      const sol = solve(parseGrid(p));
      const s = T.createState(parseGrid(p));
      for (let step = 0; step < 500 && !T.isSolved(s); step++) {
        const t = T.LADDER.find((x) => x.run(s));
        if (!t) break;
        used.add(t.name);
        for (let i = 0; i < 81; i++) {
          if (s.values[i]) expect(s.values[i]).toBe(sol[i]);
          else expect(s.cands[i] & bit(sol[i])).not.toBe(0);
        }
      }
    }
    for (const name of ["locked candidates", "naked pair", "hidden pair", "naked triple",
      "x-wing", "xy-wing", "xyz-wing", "simple coloring"]) {
      expect(used, name).toContain(name);
    }
  });
});
