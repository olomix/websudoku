import { describe, expect, it } from "vitest";
import { LEVELS, formatId, parseId } from "../../web/js/core/catalog.js";

describe("catalog IDs", () => {
  it("formats level and position", () => {
    expect(formatId(3, 42)).toBe(300042);
    expect(formatId(1, 1)).toBe(100001);
  });

  it("parses valid IDs and ignores separators", () => {
    expect(parseId("300042")).toEqual({ id: 300042, level: 3, position: 42 });
    expect(parseId(" 300 042 ")?.id).toBe(300042);
    expect(parseId("300,042")?.id).toBe(300042);
    expect(parseId("#4-00001")?.level).toBe(4);
    expect(parseId(100001)?.position).toBe(1);
  });

  it("rejects malformed IDs", () => {
    for (const bad of ["", "abc", "500001", "000001", "10000", "1000001", "100000", null, "3e5"]) {
      expect(parseId(bad)).toBeNull();
    }
  });

  it("names the four levels", () => {
    expect(Object.values(LEVELS)).toEqual(["Easy", "Moderate", "Hard", "Evil"]);
  });
});

describe("catalog lookup across chunks", () => {
  // chunkSize 2: positions 1-2 in chunk 001, 3-4 in 002, 5 in 003.
  const files = {
    "t/index.json": { chunkSize: 2, levels: { 1: 5 } },
    "t/level-1-001.json": ["p1", "p2"],
    "t/level-1-002.json": ["p3", "p4"],
    "t/level-1-003.json": ["p5"],
  };
  const fetched = [];
  globalThis.fetch = async (url) => {
    fetched.push(url);
    return url in files
      ? { ok: true, json: async () => files[url] }
      : { ok: false, status: 404, json: async () => null };
  };

  it("maps positions to the right chunk and entry", async () => {
    const { getPuzzle } = await import("../../web/js/core/catalog.js");
    expect((await getPuzzle(100002, "t/"))?.givens).toBe("p2");
    expect((await getPuzzle(100003, "t/"))?.givens).toBe("p3");
    expect((await getPuzzle(100005, "t/"))?.givens).toBe("p5");
    expect(fetched).toContain("t/level-1-003.json");
  });

  it("returns null past the index count without fetching a chunk", async () => {
    const { getPuzzle } = await import("../../web/js/core/catalog.js");
    const before = fetched.length;
    expect(await getPuzzle(100006, "t/")).toBeNull();
    expect(fetched.slice(before).filter((u) => u.includes("level-"))).toEqual([]);
  });

  it("draws random IDs only inside the count", async () => {
    const { randomId } = await import("../../web/js/core/catalog.js");
    expect(await randomId(1, () => 0, "t/")).toBe(100001);
    expect(await randomId(1, () => 0.9999, "t/")).toBe(100005);
  });
});
