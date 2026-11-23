// Catalog guarantees from contracts/catalog.md.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { grade } from "../../web/js/core/grader.js";
import { countSolutions } from "../../web/js/core/solver.js";
import { chunkName } from "../../web/js/core/catalog.js";
import { CHUNK_SIZE, PUZZLES_DIR, readIndex, readLevel } from "../../tools/catalog.js";
import { GIVENS_RANGE, canonical } from "../../tools/generate.js";

const LEVELS = [1, 2, 3, 4];
const catalog = Object.fromEntries(
  await Promise.all(LEVELS.map(async (l) => [l, await readLevel(l)])));
const digits = (p) => [...p].map(Number);

/** stdout, or null when git exits non-zero. */
function git(...args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

const resolves = (ref) => git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`) != null;

/** Latest release-* tag, else main, else origin/main (guarantee 5). */
function baselineRef() {
  const tags = git("tag", "--list", "release-*", "--sort=-creatordate")?.trim().split("\n")
    .filter(Boolean);
  if (tags?.length) return tags[0];
  // A clone of a feature branch often has only the remote-tracking main.
  return resolves("main") || !resolves("origin/main") ? "main" : "origin/main";
}

/**
 * A level as committed at `ref`, in either file format, or null.
 * @returns {string[] | null}
 */
function levelAt(ref, level) {
  const legacy = git("show", `${ref}:web/puzzles/level-${level}.json`);
  if (legacy != null) return JSON.parse(legacy);
  const index = git("show", `${ref}:web/puzzles/index.json`);
  if (index == null) return null;
  const { chunkSize, levels } = JSON.parse(index);
  const count = levels[level] ?? 0;
  if (!count) return null;
  const list = [];
  for (let k = 1; k <= Math.ceil(count / chunkSize); k++) {
    list.push(...JSON.parse(git("show", `${ref}:web/puzzles/${chunkName(level, k)}`)));
  }
  return list.slice(0, count);
}

describe("file layout", () => {
  it("serves every level from chunk files of at most 1,000 entries, under 100 KB each", async () => {
    const index = await readIndex();
    expect(index.chunkSize).toBe(CHUNK_SIZE);
    const files = readdirSync(PUZZLES_DIR).filter((f) => f.endsWith(".json"));
    expect(files.filter((f) => /^level-\d\.json$/.test(f)), "old single-file format").toEqual([]);
    for (const level of LEVELS) {
      const count = index.levels[level];
      expect(count).toBe(catalog[level].length);
      const chunks = Math.ceil(count / CHUNK_SIZE);
      for (let k = 1; k <= chunks; k++) {
        expect(statSync(`${PUZZLES_DIR}${chunkName(level, k)}`).size).toBeLessThan(100 * 1024);
      }
      expect(files).not.toContain(chunkName(level, chunks + 1));
    }
  });
});

describe.each(LEVELS)("level %i", (level) => {
  const list = catalog[level];

  it("has at least 1,000 well-formed entries (6)", () => {
    expect(list.length).toBeGreaterThanOrEqual(1000);
    for (const p of list) expect(p).toMatch(/^[0-9]{81}$/);
  });

  it("every entry has exactly one solution (1)", () => {
    for (const p of list) expect(countSolutions(digits(p), 2)).toBe(1);
  });

  it("every entry grades to its level (2)", () => {
    for (const p of list) expect(grade(digits(p)).level).toBe(level);
  });

  it("givens count is inside the level range (3)", () => {
    const [min, max] = GIVENS_RANGE[level];
    for (const p of list) {
      const n = [...p].filter((c) => c !== "0").length;
      expect(n).toBeGreaterThanOrEqual(min);
      expect(n).toBeLessThanOrEqual(max);
    }
  });

  it("is append-only against the release baseline (5)", ({ skip }) => {
    const ref = baselineRef();
    // A missing baseline must fail: a silent skip would switch the guard off.
    expect(resolves(ref),
      `baseline ref ${ref} not found; run git fetch origin main:refs/remotes/origin/main --tags`)
      .toBe(true);
    const before = levelAt(ref, level);
    if (before == null) skip(`no level ${level} at ${ref}`);
    expect(list.slice(0, before.length)).toEqual(before);
  });
});

describe("whole catalog", () => {
  it("has no duplicates, also after rotation, reflection or relabelling (4)", () => {
    const seen = new Map();
    for (const l of LEVELS) {
      catalog[l].forEach((p, k) => {
        const key = canonical(p);
        expect(seen.get(key), `${l}/${k + 1} duplicates ${seen.get(key)}`).toBeUndefined();
        seen.set(key, `${l}/${k + 1}`);
      });
    }
  });

  it("canonical form ignores rotation and relabelling", () => {
    const p = catalog[1][0];
    const rotated = [...Array(81).keys()]
      .map((i) => p[(8 - (i % 9)) * 9 + Math.floor(i / 9)]).join("");
    const relabelled = [...p].map((c) => (c === "0" ? "0" : String(10 - Number(c)))).join("");
    expect(canonical(rotated)).toBe(canonical(p));
    expect(canonical(relabelled)).toBe(canonical(p));
  });
});
