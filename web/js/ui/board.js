// @ts-check
/**
 * Board view: 9 box elements of 9 cells each (research R11), so the light
 * theme can draw box lines and the dark theme box gaps from one DOM.
 */
import { BOXES, arePeers, colOf, rowOf } from "../core/grid.js";

/**
 * @typedef {object} BoardView
 * @property {number[]} values
 * @property {number[]} candidates
 * @property {number[]} givens
 * @property {number | null} selected
 * @property {Set<number>} conflicts
 * @property {Set<number>} wrong
 * @property {boolean} paused
 */

/**
 * @param {HTMLElement} root
 * @param {(cell: number) => void} onSelect
 */
export function createBoard(root, onSelect) {
  /** @type {HTMLElement[]} */
  const cells = new Array(81);
  /** Last rendered class and content per cell, to touch only changed cells. */
  const last = new Array(81).fill("");

  root.replaceChildren(...BOXES.map((box) => {
    const b = document.createElement("div");
    b.className = "box";
    for (const i of box) {
      const c = document.createElement("div");
      c.className = "cell";
      c.dataset.i = String(i);
      c.setAttribute("role", "gridcell");
      cells[i] = c;
      b.appendChild(c);
    }
    return b;
  }));

  root.addEventListener("pointerdown", (e) => {
    const target = /** @type {HTMLElement} */ (e.target).closest(".cell");
    if (target instanceof HTMLElement && target.dataset.i) {
      // preventDefault stops text selection but also keeps focus where it
      // was, so a focused field or button would still get the next key.
      e.preventDefault();
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused !== document.body) focused.blur();
      onSelect(Number(target.dataset.i));
    }
  });

  /** @param {BoardView} v */
  function render(v) {
    root.classList.toggle("is-paused", v.paused);
    const sel = v.selected;
    const selValue = sel === null ? 0 : v.values[sel];
    for (let i = 0; i < 81; i++) {
      const value = v.values[i];
      const cls = ["cell"];
      if (v.givens[i]) cls.push("given");
      else if (value) cls.push("user");
      if (i === sel) cls.push("sel");
      else if (sel !== null && arePeers(i, sel)) cls.push("peer");
      if (value && selValue && i !== sel && value === selValue) cls.push("same");
      if (v.conflicts.has(i)) cls.push("conflict");
      if (v.wrong.has(i)) cls.push("wrong");
      const className = cls.join(" ");
      const content = value ? `v${value}` : `c${v.candidates[i]}`;
      const key = `${className}|${content}`;
      if (last[i] === key) continue;
      last[i] = key;

      const el = cells[i];
      el.className = className;
      el.dataset.value = String(value);
      el.dataset.candidates = String(v.candidates[i]);
      const where = `Row ${rowOf(i) + 1}, column ${colOf(i) + 1}`;
      if (value) {
        el.textContent = String(value);
        el.setAttribute("aria-label", `${where}: ${value}`);
      } else {
        const marks = [];
        const grid = document.createElement("div");
        grid.className = "cands";
        for (let d = 1; d <= 9; d++) {
          const s = document.createElement("span");
          if (v.candidates[i] & (1 << (d - 1))) {
            s.textContent = String(d);
            marks.push(d);
          }
          grid.appendChild(s);
        }
        el.replaceChildren(grid);
        el.setAttribute("aria-label",
          marks.length ? `${where}: candidates ${marks.join(" ")}` : `${where}: empty`);
      }
    }
  }

  return { render };
}
