// @ts-check
/**
 * Header: level selector, puzzle number field, puzzle info, timer, actions
 * and settings.
 */
import { LEVELS } from "../core/catalog.js";

/**
 * @typedef {object} HeaderActions
 * @property {(level: 1|2|3|4) => void} level
 * @property {(input: string) => void} goto
 * @property {() => void} togglePause
 * @property {() => void} check
 * @property {() => void} copyLink
 * @property {(theme: "auto"|"light"|"dark") => void} theme
 * @property {(on: boolean) => void} highlightConflicts
 */

/**
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {(string | Node)[]} [children]
 */
function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

/**
 * @param {HTMLElement} root
 * @param {HeaderActions} act
 */
export function createHeader(root, act) {
  const levelButtons = /** @type {const} */ ([1, 2, 3, 4]).map((l) => {
    const b = h("button", { type: "button", "aria-pressed": "false", "data-level": String(l) },
      [LEVELS[l]]);
    b.addEventListener("click", () => act.level(l));
    return b;
  });
  const levels = h("div", { class: "levels", role: "group", "aria-label": "Level" }, levelButtons);

  const idInput = /** @type {HTMLInputElement} */ (h("input", {
    type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "Puzzle #",
    "aria-label": "Puzzle number", name: "puzzle",
  }));
  const goto = h("form", { class: "goto" }, [idInput, h("button", { type: "submit", class: "btn" }, ["Go"])]);
  goto.addEventListener("submit", (e) => {
    e.preventDefault();
    act.goto(idInput.value);
    idInput.blur();
  });

  const info = h("span", { class: "info" });
  const clock = h("span", { class: "clock", "aria-label": "Time" }, ["0:00"]);
  const pause = h("button", { type: "button", class: "btn", id: "pause" }, ["Pause"]);
  const check = h("button", { type: "button", class: "btn", id: "check" }, ["Check"]);
  const copy = h("button", { type: "button", class: "btn", id: "copy-link" }, ["Copy link"]);
  pause.addEventListener("click", act.togglePause);
  check.addEventListener("click", act.check);
  copy.addEventListener("click", act.copyLink);

  const theme = /** @type {HTMLSelectElement} */ (h("select", { id: "theme" }, [
    h("option", { value: "auto" }, ["Auto"]),
    h("option", { value: "light" }, ["Light"]),
    h("option", { value: "dark" }, ["Dark"]),
  ]));
  theme.addEventListener("change", () =>
    act.theme(/** @type {"auto"|"light"|"dark"} */ (theme.value)));
  const conflicts = /** @type {HTMLInputElement} */ (h("input", { type: "checkbox", id: "conflicts" }));
  conflicts.addEventListener("change", () => act.highlightConflicts(conflicts.checked));

  root.replaceChildren(
    h("div", { class: "row" }, [h("h1", {}, ["Sudoku"]), levels, h("span", { class: "spacer" }), goto]),
    h("div", { class: "row" }, [info, clock, h("span", { class: "spacer" }), pause, check, copy]),
    h("div", { class: "settings" }, [
      h("label", {}, ["Theme ", theme]),
      h("label", {}, [conflicts, "Show conflicts"]),
    ]),
  );

  /**
   * @param {{ level: 1|2|3|4, puzzleId: number, status: string,
   *   theme: string, highlightConflicts: boolean }} v
   */
  function render(v) {
    levelButtons.forEach((b, k) => b.setAttribute("aria-pressed", String(k + 1 === v.level)));
    info.replaceChildren(`${LEVELS[v.level]} `, h("span", { class: "id" }, [`#${v.puzzleId}`]));
    pause.textContent = v.status === "paused" ? "Resume" : "Pause";
    /** @type {HTMLButtonElement} */ (pause).disabled = v.status === "solved";
    /** @type {HTMLButtonElement} */ (check).disabled = v.status !== "playing";
    theme.value = v.theme;
    conflicts.checked = v.highlightConflicts;
  }

  /** @param {string} text */
  const setClock = (text) => {
    if (clock.textContent !== text) clock.textContent = text;
  };

  return { render, setClock };
}
