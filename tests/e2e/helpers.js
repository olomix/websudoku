import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { solve } from "../../web/js/core/solver.js";

const files = {};
/** Givens and solution of a catalog puzzle, read the same way the game does. */
export function puzzle(id) {
  const level = Math.floor(id / 100000);
  files[level] ??= JSON.parse(readFileSync(new URL(`../../web/puzzles/level-${level}.json`, import.meta.url), "utf8"));
  const givens = [...files[level][(id % 100000) - 1]].map(Number);
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

export async function open(page, id) {
  await page.goto(id ? `/?id=${id}` : "/");
  await expect(page.locator(".cell")).toHaveCount(81);
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
