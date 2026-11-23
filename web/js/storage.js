// @ts-check
/**
 * Versioned, failure-safe device storage (contracts/storage.md).
 * A value that does not parse or has an unknown version is deleted.
 */

export const VERSION = 1;
export const KEYS = /** @type {const} */ ({
  game: "ws:v1:game",
  best: "ws:v1:best",
  settings: "ws:v1:settings",
});

/** @returns {Storage | null} */
function backend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @returns {any} the stored object without its `v` field, or null
 */
export function read(key) {
  const ls = backend();
  if (!ls) return null;
  let raw;
  try {
    raw = ls.getItem(key);
  } catch {
    return null;
  }
  if (raw == null) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && obj.v === VERSION) {
      const { v: _v, ...rest } = obj;
      return rest;
    }
  } catch {
    // fall through: corrupt value
  }
  remove(key);
  return null;
}

/**
 * @param {string} key
 * @param {object} value
 * @returns {boolean} false when the write failed (quota, private mode)
 */
export function write(key, value) {
  const ls = backend();
  if (!ls) return false;
  try {
    ls.setItem(key, JSON.stringify({ v: VERSION, ...value }));
    return true;
  } catch {
    return false;
  }
}

/** @param {string} key */
export function remove(key) {
  try {
    backend()?.removeItem(key);
  } catch {
    // storage unavailable: nothing to remove
  }
}

/**
 * @typedef {{ theme: "auto" | "light" | "dark", highlightConflicts: boolean, inputMode: "value" | "candidate" }} Settings
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = { theme: "auto", highlightConflicts: true, inputMode: "value" };

/** @returns {Settings} */
export function loadSettings() {
  const s = read(KEYS.settings) ?? {};
  return {
    theme: ["auto", "light", "dark"].includes(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
    highlightConflicts: typeof s.highlightConflicts === "boolean"
      ? s.highlightConflicts : DEFAULT_SETTINGS.highlightConflicts,
    inputMode: s.inputMode === "candidate" ? "candidate" : "value",
  };
}

/** @param {Settings} s */
export const saveSettings = (s) => write(KEYS.settings, s);

/** @returns {any} the saved game object, or null */
export const loadGame = () => read(KEYS.game);

/** @param {{ toJSON(): object }} game */
export const saveGame = (game) => write(KEYS.game, game.toJSON());

/**
 * @param {number} puzzleId
 * @returns {{ timeMs: number, date: string } | null}
 */
export function getBest(puzzleId) {
  const t = read(KEYS.best)?.times?.[puzzleId];
  return t && Number.isFinite(t.timeMs) ? t : null;
}

/**
 * Store a result as personal best when it is clean and faster.
 * @param {{ puzzleId: number, timeMs: number, label: string, date: string }} r
 * @returns {{ best: { timeMs: number, date: string } | null, improved: boolean }}
 */
export function recordBest(r) {
  const times = read(KEYS.best)?.times ?? {};
  const prev = times[r.puzzleId] ?? null;
  if (r.label !== "clean" || (prev && prev.timeMs <= r.timeMs)) {
    return { best: prev, improved: false };
  }
  const best = { timeMs: r.timeMs, date: r.date };
  write(KEYS.best, { times: { ...times, [r.puzzleId]: best } });
  return { best, improved: true };
}
