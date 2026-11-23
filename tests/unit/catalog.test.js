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
