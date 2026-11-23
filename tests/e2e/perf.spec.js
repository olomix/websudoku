import { expect, test } from "@playwright/test";
import { cell, firstEmpty, isDesktop, puzzle } from "./helpers.js";

const P = puzzle(100001);

test.beforeEach(({}, info) => test.skip(!isDesktop(info.project.name), "desktop engines only"));

test("board is interactive within 3 s of navigation (SC-001)", async ({ page }) => {
  const t = Date.now();
  await page.goto(`/?id=${P.id}`);
  await expect(page.locator(".cell")).toHaveCount(81);
  await cell(page, firstEmpty(P)).click();
  await expect(cell(page, firstEmpty(P))).toHaveClass(/\bsel\b/);
  expect(Date.now() - t).toBeLessThan(3000);
});

test("a typed digit shows within 100 ms (SC-005)", async ({ page }) => {
  await page.goto(`/?id=${P.id}`);
  const i = firstEmpty(P);
  await cell(page, i).click();
  const ms = await page.evaluate((i) => new Promise((resolve) => {
    const el = document.querySelector(`.cell[data-i="${i}"]`);
    const t = performance.now();
    new MutationObserver(() => resolve(performance.now() - t))
      .observe(el, { childList: true, subtree: true, characterData: true });
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "6", code: "Digit6", bubbles: true }));
  }), i);
  expect(ms).toBeLessThan(100);
});
