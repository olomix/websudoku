// @ts-check
/**
 * Append new puzzles to the catalog.
 *
 *   node tools/catalog.js --level 4 --count 50
 *
 * Existing entries are never changed or reordered (contracts/catalog.md).
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { attempt, canonical } from "./generate.js";

export const PUZZLES_DIR = fileURLToPath(new URL("../web/puzzles/", import.meta.url));

/** @param {number} level */
export const levelFile = (level) => `${PUZZLES_DIR}level-${level}.json`;

/** @param {number} level @returns {Promise<string[]>} */
export async function readLevel(level) {
  try {
    return JSON.parse(await readFile(levelFile(level), "utf8"));
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === "ENOENT") return [];
    throw e;
  }
}

/**
 * One entry per line keeps diffs small and makes append-only easy to review.
 * @param {string[]} list
 */
export const formatLevel = (list) =>
  list.length ? `[\n${list.map((p) => `  "${p}"`).join(",\n")}\n]\n` : "[]\n";

async function main() {
  const { values } = parseArgs({
    options: {
      level: { type: "string" },
      count: { type: "string", default: "100" },
    },
  });
  const level = Number(values.level);
  const count = Number(values.count);
  if (![1, 2, 3, 4].includes(level) || !(count > 0)) {
    console.error("usage: node tools/catalog.js --level 1..4 --count N");
    process.exit(2);
  }

  const seen = new Set();
  for (const l of [1, 2, 3, 4]) for (const p of await readLevel(l)) seen.add(canonical(p));

  const list = await readLevel(level);
  const start = performance.now();
  let added = 0;
  let tries = 0;
  while (added < count) {
    tries++;
    const p = attempt(/** @type {1|2|3|4} */ (level), Math.random);
    if (!p) continue;
    const key = canonical(p);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(p);
    added++;
  }
  await writeFile(levelFile(level), formatLevel(list));
  const secs = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`level ${level}: +${added} (total ${list.length}) in ${secs}s, ${tries} attempts`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
