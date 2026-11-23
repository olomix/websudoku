import { expect, test } from "@playwright/test";
import { open } from "./helpers.js";

test.describe("phone layout at 320 px", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("mobile"), "mobile projects only");
    await page.setViewportSize({ width: 320, height: 640 });
  });

  test("no horizontal scroll and the keypad sits below the board", async ({ page }) => {
    await open(page, 100001);
    const sizes = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
    const board = await page.locator("#board").boundingBox();
    const keypad = await page.locator("#keypad").boundingBox();
    expect(keypad.y).toBeGreaterThanOrEqual(board.y + board.height);
  });

  test("tapping does not zoom: touch-action is set and inputs use 16 px", async ({ page }) => {
    await open(page, 100001);
    const ta = await page.locator("#board").evaluate((e) => getComputedStyle(e).touchAction);
    expect(ta).toBe("manipulation");
    const fs = await page.getByLabel("Puzzle number").evaluate((e) => getComputedStyle(e).fontSize);
    expect(parseFloat(fs)).toBeGreaterThanOrEqual(16);
  });

  test("tap a cell and a keypad digit to fill it", async ({ page }) => {
    await open(page, 100001);
    const c = page.locator(".cell:not(.given)").first();
    await c.tap();
    await page.locator('.keypad [data-digit="7"]').tap();
    await expect(c).toHaveText("7");
  });
});
