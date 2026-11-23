// @ts-check
/**
 * Modal dialogs: completion, puzzle not found, copy fallback.
 */
import { LEVELS } from "../core/catalog.js";
import { formatTime } from "../core/timer.js";

/** @type {HTMLDialogElement | null} */
let current = null;

export const isOpen = () => current !== null;

/**
 * @param {string} id
 * @param {string} title
 * @param {(Node | string)[]} body
 * @param {{ label: string, primary?: boolean, id?: string, run?: () => void | boolean }[]} actions
 *   `run` returning true keeps the dialog open
 */
function open(id, title, body, actions) {
  close();
  const d = document.createElement("dialog");
  d.id = id;
  const h = document.createElement("h2");
  h.textContent = title;
  const bar = document.createElement("div");
  bar.className = "actions";
  for (const a of actions) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = a.primary ? "btn primary" : "btn";
    b.textContent = a.label;
    if (a.id) b.id = a.id;
    b.addEventListener("click", () => {
      // An action may open another dialog; close only this one.
      if (a.run?.() !== true) d.close();
    });
    bar.appendChild(b);
  }
  d.append(h, ...body, bar);
  d.addEventListener("close", () => {
    d.remove();
    if (current === d) current = null;
  });
  /** @type {HTMLElement} */ (document.getElementById("dialogs")).appendChild(d);
  current = d;
  d.showModal();
  return d;
}

export function close() {
  current?.close();
}

/** @param {string} text */
const p = (text) => {
  const el = document.createElement("p");
  el.textContent = text;
  return el;
};

/**
 * @param {object} v
 * @param {import("../core/share.js").Result} v.result
 * @param {{ timeMs: number } | null} v.best
 * @param {boolean} v.improved
 * @param {() => void} v.onShare
 * @param {() => void} v.onNew
 */
export function showCompletion({ result, best, improved, onShare, onNew }) {
  const dl = document.createElement("dl");
  /** @type {[string, string][]} */
  const rows = [
    ["Puzzle", `#${result.puzzleId}`],
    ["Level", LEVELS[result.level]],
    ["Time", formatTime(result.timeMs)],
    ["Result", result.label],
  ];
  if (best) rows.push(["Your best", formatTime(best.timeMs) + (improved ? " (new)" : "")]);
  for (const [k, v] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    dd.dataset.field = k.toLowerCase().replace(/\s+/g, "-");
    dl.append(dt, dd);
  }
  open("completion", "Solved!", [dl], [
    { label: "Share result", id: "share", run: () => { onShare(); return true; } },
    { label: "New puzzle", id: "new-puzzle", primary: true, run: onNew },
    { label: "Close" },
  ]);
}

/**
 * @param {string} input what the player typed
 * @param {() => void} onRandom
 */
export function showNotFound(input, onRandom) {
  const shown = input.trim().slice(0, 20) || "(empty)";
  open("not-found", "Puzzle not found", [
    p(`There is no puzzle with number ${shown}. Your current game is kept.`),
  ], [
    { label: "Random puzzle", id: "random-puzzle", run: onRandom },
    { label: "Close", primary: true },
  ]);
}

/**
 * Shown when the clipboard is not available: the player copies by hand.
 * @param {string} text
 * @param {() => void} [back] reopens the dialog this one replaced
 */
export function showCopyFallback(text, back) {
  const ta = document.createElement("textarea");
  ta.readOnly = true;
  ta.value = text;
  const d = open("copy-fallback", "Copy this text", [p("Copying is blocked here. Select the text and copy it."), ta],
    [{ label: back ? "Back" : "Close", primary: true, run: back }]);
  ta.focus();
  ta.select();
  return d;
}
