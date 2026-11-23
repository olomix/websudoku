import { beforeEach, describe, expect, it } from "vitest";
import { buildResult, puzzleLink, shareText } from "../../web/js/core/share.js";
import { getBest, recordBest } from "../../web/js/storage.js";

describe("result and share text", () => {
  const loc = { origin: "https://example.org", pathname: "/sudoku/" };

  it("builds the puzzle link", () => {
    expect(puzzleLink(300042, loc)).toBe("https://example.org/sudoku/?id=300042");
  });

  it("formats the share text per contracts/ui.md", () => {
    const r = buildResult({ puzzleId: 300042, level: 3, elapsedMs: 462_000, assisted: false },
      new Date("2026-11-23T10:00:00Z"));
    expect(r).toEqual({ puzzleId: 300042, level: 3, timeMs: 462_000, label: "clean", date: "2026-11-23" });
    expect(shareText(r, puzzleLink(300042, loc))).toBe(
      "Sudoku #300042 (Hard) — solved in 7:42, clean\nhttps://example.org/sudoku/?id=300042");
  });

  it("labels an assisted result", () => {
    expect(buildResult({ puzzleId: 1, level: 1, elapsedMs: 0, assisted: true }).label).toBe("assisted");
  });
});

describe("personal best", () => {
  beforeEach(() => {
    const m = new Map();
    globalThis.localStorage = {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, v),
      removeItem: (k) => m.delete(k),
    };
  });
  const res = (timeMs, label = "clean") => ({ puzzleId: 100001, timeMs, label, date: "2026-11-23" });

  it("stores the first clean time", () => {
    expect(recordBest(res(5000))).toEqual({ best: { timeMs: 5000, date: "2026-11-23" }, improved: true });
    expect(getBest(100001)?.timeMs).toBe(5000);
  });

  it("keeps the lower time", () => {
    recordBest(res(5000));
    expect(recordBest(res(6000)).improved).toBe(false);
    expect(getBest(100001)?.timeMs).toBe(5000);
    expect(recordBest(res(4000)).improved).toBe(true);
    expect(getBest(100001)?.timeMs).toBe(4000);
  });

  it("ignores assisted results but returns the previous best", () => {
    expect(recordBest(res(1000, "assisted")).best).toBeNull();
    recordBest(res(5000));
    expect(recordBest(res(1000, "assisted"))).toEqual({ best: { timeMs: 5000, date: "2026-11-23" }, improved: false });
  });
});
