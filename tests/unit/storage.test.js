import { beforeEach, describe, expect, it } from "vitest";
import { KEYS, read, remove, write } from "../../web/js/storage.js";

class MemoryStorage {
  constructor() { this.m = new Map(); this.fail = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.fail) throw new Error("QuotaExceededError"); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

describe("storage", () => {
  let ls;
  beforeEach(() => {
    ls = new MemoryStorage();
    globalThis.localStorage = ls;
  });

  it("round-trips a versioned value", () => {
    expect(write(KEYS.settings, { theme: "dark" })).toBe(true);
    expect(JSON.parse(ls.getItem(KEYS.settings)).v).toBe(1);
    expect(read(KEYS.settings)).toEqual({ theme: "dark" });
  });

  it("returns null for a missing key", () => {
    expect(read(KEYS.game)).toBeNull();
  });

  it("deletes corrupt JSON and unknown versions", () => {
    ls.setItem(KEYS.game, "{nope");
    expect(read(KEYS.game)).toBeNull();
    expect(ls.getItem(KEYS.game)).toBeNull();
    ls.setItem(KEYS.best, JSON.stringify({ v: 99, times: {} }));
    expect(read(KEYS.best)).toBeNull();
    expect(ls.getItem(KEYS.best)).toBeNull();
  });

  it("does not throw when a write fails", () => {
    ls.fail = true;
    expect(write(KEYS.game, { a: 1 })).toBe(false);
  });

  it("works without any storage", () => {
    delete globalThis.localStorage;
    expect(read(KEYS.game)).toBeNull();
    expect(write(KEYS.game, {})).toBe(false);
    expect(() => remove(KEYS.game)).not.toThrow();
  });
});
