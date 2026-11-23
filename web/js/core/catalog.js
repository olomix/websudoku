// @ts-check
/**
 * Puzzle IDs and catalog access (contracts/catalog.md).
 * id = level * 100000 + position, position is 1-based in level-<level>.json.
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

/** @type {Map<number, Promise<string[]>>} */
const cache = new Map();

/**
 * Load one level file (once per page).
 * @param {Level} level
 * @param {string} [base] URL of the puzzles folder
 */
export function loadLevel(level, base = "puzzles/") {
  let p = cache.get(level);
  if (!p) {
    p = fetch(`${base}level-${level}.json`).then((r) => {
      if (!r.ok) throw new Error(`cannot load level ${level}: HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(level));
    cache.set(level, p);
  }
  return p;
}

/**
 * @param {number} id
 * @returns {Promise<{ id: number, level: Level, givens: string } | null>}
 */
export async function getPuzzle(id) {
  const parsed = parseId(id);
  if (!parsed) return null;
  const list = await loadLevel(parsed.level);
  const givens = list[parsed.position - 1];
  if (!givens) return null;
  return { id: parsed.id, level: parsed.level, givens };
}

/**
 * @param {Level} level
 * @param {() => number} [random]
 */
export async function randomId(level, random = Math.random) {
  const list = await loadLevel(level);
  return formatId(level, 1 + Math.floor(random() * list.length));
}
