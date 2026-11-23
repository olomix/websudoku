import { describe, expect, it } from "vitest";
import {
  BOXES, PEERS, arePeers, boxOf, colOf, findConflicts, formatGrid, indexOf, parseGrid, rowOf,
} from "../../web/js/core/grid.js";
import { EASY } from "./fixtures.js";

describe("grid", () => {
  it("maps index to row, column and box", () => {
    expect([rowOf(40), colOf(40), boxOf(40)]).toEqual([4, 4, 4]);
    expect([rowOf(80), colOf(80), boxOf(80)]).toEqual([8, 8, 8]);
    expect(indexOf(3, 7)).toBe(34);
    expect(boxOf(indexOf(5, 2))).toBe(3);
  });

  it("gives every cell 20 distinct peers", () => {
    for (const p of PEERS) expect(new Set(p).size).toBe(20);
    expect(PEERS[0]).toContain(80 - 80 + 10);
    expect(arePeers(0, 80)).toBe(false);
    expect(arePeers(0, 0)).toBe(false);
    expect(arePeers(0, 20)).toBe(true);
  });

  it("lists box cells in reading order", () => {
    expect(BOXES[4]).toEqual([30, 31, 32, 39, 40, 41, 48, 49, 50]);
  });

  it("finds conflicts in row, column and box", () => {
    const v = parseGrid(EASY);
    expect(findConflicts(v).size).toBe(0);
    v[2] = 5; // same row as the 5 at 0
    expect([...findConflicts(v)].sort((a, b) => a - b)).toEqual([0, 2]);
    v[2] = 0;
    v[20] = 6; // box 0 and column 2? 6 at index 9 shares box 0
    expect(findConflicts(v).has(9)).toBe(true);
    expect(findConflicts(v).has(20)).toBe(true);
  });

  it("parses and formats grids", () => {
    expect(formatGrid(parseGrid(EASY))).toBe(EASY);
    expect(() => parseGrid("123")).toThrow();
    expect(parseGrid(".".repeat(81)).every((x) => x === 0)).toBe(true);
  });
});
