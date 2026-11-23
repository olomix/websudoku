// @ts-check
/**
 * Puzzle IDs and catalog access (contracts/catalog.md).
 * id = level * 100000 + position; position is 1-based across the level's
 * chunk files (index.json gives the count).
 */

export const LEVELS = /** @type {const} */ ({
  1: "Easy",
  2: "Moderate",
  3: "Hard",
  4: "Evil",
});

/** @typedef {1 | 2 | 3 | 4} Level */

/**
 * @param {Level} level
 * @param {number} position 1-based
 */
export const formatId = (level, position) => level * 100000 + position;

/**
 * Parse user input into an ID. Spaces and separators are ignored.
 * Does not check that the position exists in the catalog.
 * @param {unknown} input
 * @returns {{ id: number, level: Level, position: number } | null}
 */
export function parseId(input) {
  const s = String(input ?? "").replace(/[\s,._\-#']/g, "");
  if (!/^[1-4][0-9]{5}$/.test(s)) return null;
  const id = Number(s);
  const position = id % 100000;
  if (position < 1) return null;
  return { id, level: /** @type {Level} */ (Math.floor(id / 100000)), position };
}

/** @type {Map<string, Promise<any>>} */
const cache = new Map();

/**
 * Fetch JSON once per page; a failed fetch is forgotten so it can be retried.
 * @param {string} url
 */
function fetchJson(url) {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`cannot load ${url}: HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/**
 * Chunk file `k` (1-based) of a level (contracts/catalog.md).
 * @param {number} level
 * @param {number} k
 */
export const chunkName = (level, k) => `level-${level}-${String(k).padStart(3, "0")}.json`;

/**
 * @param {string} base
 * @returns {Promise<{ chunkSize: number, levels: Record<string, number> }>}
 */
const loadIndex = (base) => fetchJson(`${base}index.json`);

/**
 * @param {number} id
 * @param {string} [base] URL of the puzzles folder
 * @returns {Promise<{ id: number, level: Level, givens: string } | null>}
 */
export async function getPuzzle(id, base = "puzzles/") {
  const parsed = parseId(id);
  if (!parsed) return null;
  const index = await loadIndex(base);
  if (parsed.position > (index.levels[parsed.level] ?? 0)) return null;
  const k = Math.ceil(parsed.position / index.chunkSize);
  /** @type {string[]} */
  const list = await fetchJson(`${base}${chunkName(parsed.level, k)}`);
  const givens = list[(parsed.position - 1) % index.chunkSize];
  if (!givens) return null;
  return { id: parsed.id, level: parsed.level, givens };
}

/**
 * @param {Level} level
 * @param {() => number} [random]
 * @param {string} [base]
 */
export async function randomId(level, random = Math.random, base = "puzzles/") {
  const count = (await loadIndex(base)).levels[level] ?? 0;
  if (count < 1) throw new Error(`level ${level} has no puzzles`);
  return formatId(level, 1 + Math.floor(random() * count));
}
