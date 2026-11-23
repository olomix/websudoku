import { expect, test } from "@playwright/test";
import { cell, firstEmpty, open, puzzle, type } from "./helpers.js";

const P = puzzle(100001);

test("check marks only the wrong cell and counts it", async ({ page }) => {
  await open(page, P.id);
  const a = firstEmpty(P, 0);
  const b = firstEmpty(P, 1);
  await type(page, a, P.solution[a] === 9 ? 1 : 9);
  await type(page, b, P.solution[b]);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator("#message")).toHaveText("1 mistake.");
  await expect(page.locator(".cell.wrong")).toHaveCount(1);
  await expect(cell(page, a)).toHaveClass(/\bwrong\b/);
});

test("check with no mistakes says so", async ({ page }) => {
  await open(page, P.id);
  const a = firstEmpty(P);
  await type(page, a, P.solution[a]);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator("#message")).toHaveText("No mistakes so far.");
  await expect(page.locator(".cell.wrong")).toHaveCount(0);
});

test("the page has no show-solution control (FR-026)", async ({ page }) => {
  await open(page, P.id);
  await expect(page.getByRole("button", { name: /solution|solve|reveal|hint/i })).toHaveCount(0);
});
