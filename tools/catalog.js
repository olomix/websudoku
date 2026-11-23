// @ts-check
/**
 * Append new puzzles to the catalog.
 *
 *   node tools/catalog.js --level 4 --count 50
 *
 * Existing entries are never changed or reordered (contracts/catalog.md).
 * `--count 0` only rewrites the level in the current file format.
 */
import { readFile, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chunkName } from "../web/js/core/catalog.js";
import { attempt, canonical } from "./generate.js";

export const PUZZLES_DIR = fileURLToPath(new URL("../web/puzzles/", import.meta.url));
/** Entries per chunk file; small files keep the first load fast (SC-001). */
export const CHUNK_SIZE = 1000;

/** @param {string} name @returns {Promise<any>} JSON, or undefined when absent */
async function readJson(name) {
  try {
    return JSON.parse(await readFile(`${PUZZLES_DIR}${name}`, "utf8"));
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === "ENOENT") return undefined;
    throw e;
  }
}

/** @returns {Promise<{ chunkSize: number, levels: Record<string, number> }>} */
export async function readIndex() {
  return (await readJson("index.json")) ?? { chunkSize: CHUNK_SIZE, levels: {} };
}

/**
 * All entries of a level, in ID order. A single-file `level-N.json` from
 * the old format wins when present: it is the newer, complete list.
 * @param {number} level
 * @returns {Promise<string[]>}
 */
export async function readLevel(level) {
  const legacy = await readJson(`level-${level}.json`);
  if (legacy) return legacy;
  const index = await readIndex();
  const count = index.levels[level] ?? 0;
  const list = [];
  for (let k = 1; k <= Math.ceil(count / index.chunkSize); k++) {
    list.push(...(await readJson(chunkName(level, k))));
  }
  return list.slice(0, count);
}

/**
 * One entry per line keeps diffs small and makes append-only easy to review.
 * @param {string[]} list
 */
export const formatLevel = (list) =>
  list.length ? `[\n${list.map((p) => `  "${p}"`).join(",\n")}\n]\n` : "[]\n";

/**
 * Write a level as chunk files and record its size in index.json. Full
 * chunks come out byte-identical, so only the last chunk changes on append.
 * @param {number} level
 * @param {string[]} list
 */
export async function writeLevel(level, list) {
  for (let k = 1; (k - 1) * CHUNK_SIZE < list.length; k++) {
    const part = list.slice((k - 1) * CHUNK_SIZE, k * CHUNK_SIZE);
    await writeFile(`${PUZZLES_DIR}${chunkName(level, k)}`, formatLevel(part));
  }
  const index = await readIndex();
  index.chunkSize = CHUNK_SIZE;
  index.levels = { ...index.levels, [level]: list.length };
  await writeFile(`${PUZZLES_DIR}index.json`, `${JSON.stringify(index, null, 2)}\n`);
  await unlink(`${PUZZLES_DIR}level-${level}.json`).catch(() => {});
}

async function main() {
  const { values } = parseArgs({
    options: {
      level: { type: "string" },
      count: { type: "string", default: "100" },
    },
  });
  const level = Number(values.level);
  const count = Number(values.count);
  if (![1, 2, 3, 4].includes(level) || !(count >= 0)) {
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
  await writeLevel(level, list);
  const secs = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`level ${level}: +${added} (total ${list.length}) in ${secs}s, ${tries} attempts`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
