import { expect, test } from "@playwright/test";
import { cell, firstEmpty, open, puzzle, type } from "./helpers.js";

const P = puzzle(100001);

test("reload restores digits, candidates and time", async ({ page }) => {
  await open(page, P.id);
  const a = firstEmpty(P, 0);
  const b = firstEmpty(P, 1);
  await type(page, a, 8);
  await type(page, b, 3, { candidate: true });
  await page.waitForTimeout(2100);
  await page.reload();
  await expect(cell(page, a)).toHaveText("8");
  await expect(cell(page, b)).toHaveAttribute("data-candidates", String(1 << 2));
  const secs = await page.locator(".clock").textContent();
  expect(Number(secs.split(":").at(-1))).toBeGreaterThanOrEqual(2);
});

test("opening / restores the saved game", async ({ page }) => {
  await open(page, P.id);
  const a = firstEmpty(P);
  await type(page, a, 8);
  await page.goto("/");
  await expect(page).toHaveURL(/\?id=100001$/);
  await expect(cell(page, a)).toHaveText("8");
});

test("another ID in the address replaces the saved game", async ({ page }) => {
  await open(page, P.id);
  await type(page, firstEmpty(P), 8);
  await open(page, 100002);
  await expect(page.locator(".cell.user")).toHaveCount(0);
  await open(page, P.id);
  await expect(page.locator(".cell.user")).toHaveCount(0);
});
