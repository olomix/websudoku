import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { chunkName } from "../../web/js/core/catalog.js";
import { solve } from "../../web/js/core/solver.js";

/** Givens and solution of a catalog puzzle (positions up to 1,000 only). */
export function puzzle(id) {
  const level = Math.floor(id / 100000);
  const chunk = JSON.parse(readFileSync(
    new URL(`../../web/puzzles/${chunkName(level, 1)}`, import.meta.url), "utf8"));
  const givens = [...chunk[(id % 100000) - 1]].map(Number);
  return { id, level, givens, solution: solve(givens) };
}

export const cell = (page, i) => page.locator(`.cell[data-i="${i}"]`);

/** Record clipboard writes in window.__copied; `fail` makes them reject. */
export async function stubClipboard(page, { fail = false } = {}) {
  await page.addInitScript((fail) => {
    window.__copied = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (t) => {
          if (fail) throw new DOMException("blocked", "NotAllowedError");
          window.__copied.push(t);
        },
      },
    });
  }, fail);
}

/** Navigate and wait until a puzzle has started, not just until cells exist. */
export async function open(page, id) {
  await page.goto(id ? `/?id=${id}` : "/");
  await expect(page.locator(".info .id")).toHaveText(id ? `#${id}` : /^#\d{6}$/);
}

/** Type `digit` into cell `i` with the keyboard. */
export async function type(page, i, digit, { candidate = false } = {}) {
  await cell(page, i).click();
  await page.keyboard.press(candidate ? `Shift+Digit${digit}` : `Digit${digit}`);
}

/** Fill every empty cell with the solution, except the cells in `skip`. */
export async function fill(page, p, skip = []) {
  for (let i = 0; i < 81; i++) {
    if (p.givens[i] || skip.includes(i)) continue;
    await type(page, i, p.solution[i]);
  }
}

export const firstEmpty = (p, n = 0) => p.givens.map((g, i) => (g ? -1 : i)).filter((i) => i >= 0)[n];

export const isDesktop = (name) => name === "chromium" || name === "webkit";
