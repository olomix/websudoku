import { expect, test } from "@playwright/test";
import { cell, firstEmpty, open, puzzle, type } from "./helpers.js";

const P = puzzle(100001);
const marks = (page, i) => cell(page, i).locator(".cands span");

test("Shift+digit adds candidates at fixed positions", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  for (const d of [2, 5, 7]) await type(page, i, d, { candidate: true });
  await expect(marks(page, i)).toHaveText(["", "2", "", "", "5", "", "7", "", ""]);
});

test("the same candidate again removes it", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await type(page, i, 5, { candidate: true });
  await type(page, i, 5, { candidate: true });
  await expect(cell(page, i)).toHaveAttribute("data-candidates", "0");
});

test("a final digit replaces the candidates", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await type(page, i, 2, { candidate: true });
  await type(page, i, 5, { candidate: true });
  await type(page, i, 5);
  await expect(cell(page, i)).toHaveText("5");
  await expect(cell(page, i)).toHaveAttribute("data-candidates", "0");
});

test("N switches to candidate mode and back", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await cell(page, i).click();
  await page.keyboard.press("KeyN");
  await page.keyboard.press("Digit4");
  await expect(marks(page, i)).toHaveText(["", "", "", "4", "", "", "", "", ""]);
  await page.keyboard.press("KeyN");
  await page.keyboard.press("Digit4");
  await expect(cell(page, i)).toHaveText("4");
});

test("keypad mode button and digits add candidates", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await cell(page, i).click();
  await page.locator(".keypad .mode").click();
  await expect(page.locator(".keypad .mode")).toHaveAttribute("aria-pressed", "true");
  await page.locator('.keypad [data-digit="1"]').click();
  await page.locator('.keypad [data-digit="9"]').click();
  await expect(marks(page, i)).toHaveText(["1", "", "", "", "", "", "", "", "9"]);
});

test("all nine candidates show in one cell", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  for (let d = 1; d <= 9; d++) await type(page, i, d, { candidate: true });
  await expect(marks(page, i)).toHaveText(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
});
