import { expect, test } from "@playwright/test";
import { cell, fill, firstEmpty, open, puzzle, type } from "./helpers.js";

const P = puzzle(100001);

test("opens a random Easy puzzle with its ID in the address and a running timer", async ({ page }) => {
  await open(page);
  await expect(page).toHaveURL(/\?id=1\d{5}$/);
  await expect(page.locator(".info")).toContainText("Easy");
  await expect(page.locator(".clock")).not.toHaveText("0:00", { timeout: 3000 });
});

test("enters a player digit, keeps givens, clears a cell", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await type(page, i, 7);
  await expect(cell(page, i)).toHaveText("7");
  await expect(cell(page, i)).toHaveClass(/\buser\b/);
  const g = P.givens.findIndex((x) => x);
  await type(page, g, P.givens[g] === 1 ? 2 : 1);
  await expect(cell(page, g)).toHaveText(String(P.givens[g]));
  await cell(page, i).click();
  await page.keyboard.press("Backspace");
  await expect(cell(page, i)).toHaveAttribute("data-value", "0");
});

test("ignores 0 and letters", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await cell(page, i).click();
  await page.keyboard.press("Digit0");
  await page.keyboard.press("KeyQ");
  await expect(cell(page, i)).toHaveAttribute("data-value", "0");
});

test("undo and redo by keyboard and keypad", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await type(page, i, 3);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(cell(page, i)).toHaveAttribute("data-value", "0");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(cell(page, i)).toHaveText("3");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(cell(page, i)).toHaveAttribute("data-value", "0");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(cell(page, i)).toHaveText("3");
});

test("moves the selection with arrow keys and stops at the edge", async ({ page }) => {
  await open(page, P.id);
  await cell(page, 0).click();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowUp");
  await expect(cell(page, 0)).toHaveClass(/\bsel\b/);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect(cell(page, 10)).toHaveClass(/\bsel\b/);
});

test("highlights conflicting digits", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  const row = Math.floor(i / 9);
  const g = [...Array(9).keys()].map((c) => row * 9 + c).find((k) => P.givens[k]);
  await type(page, i, P.givens[g]);
  await expect(cell(page, i)).toHaveClass(/\bconflict\b/);
  await expect(cell(page, g)).toHaveClass(/\bconflict\b/);
});

test("solving shows the success message with ID and time; the timer stops", async ({ page }) => {
  await open(page, P.id);
  await fill(page, P);
  const dlg = page.locator("dialog#completion");
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('[data-field="puzzle"]')).toHaveText(`#${P.id}`);
  await expect(dlg.locator('[data-field="time"]')).toHaveText(/^\d+:\d\d$/);
  const t = await page.locator(".clock").textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator(".clock")).toHaveText(t);
});

test("a full but wrong grid is not solved", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await fill(page, P, [i]);
  await type(page, i, P.solution[i] === 9 ? 1 : 9);
  await expect(page.locator("#message")).toContainText("full");
  await expect(page.locator("dialog#completion")).toHaveCount(0);
});

test("pause hides the grid and stops the timer", async ({ page }) => {
  await open(page, P.id);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.locator("#board")).toBeHidden();
  const t = await page.locator(".clock").textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator(".clock")).toHaveText(t);
  await page.locator("#resume").click();
  await expect(page.locator("#board")).toBeVisible();
});

test("hidden page pauses; visible again resumes only that pause", async ({ page }) => {
  await open(page, P.id);
  const setVisibility = (state) => page.evaluate((s) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => s });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
  await setVisibility("hidden");
  await setVisibility("visible");
  await expect(page.locator("#board")).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await setVisibility("hidden");
  await setVisibility("visible");
  await expect(page.locator("#board")).toBeHidden();
});

test("accepts a digit key without a physical key code (on-screen keyboards)", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await cell(page, i).click();
  await page.evaluate(() => document.body.dispatchEvent(
    new KeyboardEvent("keydown", { key: "3", code: "", bubbles: true })));
  await expect(cell(page, i)).toHaveText("3");
});

test("the selected cell keeps an outline when it shows a conflict", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  const row = Math.floor(i / 9);
  const g = [...Array(9).keys()].map((c) => row * 9 + c).find((k) => P.givens[k]);
  await type(page, i, P.givens[g]);
  await expect(cell(page, i)).toHaveClass(/\bconflict\b/);
  await expect(cell(page, i)).toHaveClass(/\bsel\b/);
  const ring = await cell(page, i).evaluate((e) => getComputedStyle(e).boxShadow);
  expect(ring).not.toBe("none");
});

test("digits go to the board after a cell click, even if the Puzzle # field had focus", async ({ page }) => {
  await open(page, P.id);
  await page.getByLabel("Puzzle number").click();
  const i = firstEmpty(P);
  await type(page, i, 5);
  await expect(cell(page, i)).toHaveText("5");
  await expect(page.getByLabel("Puzzle number")).toHaveValue("");
});

test("Space after clicking a header button and a cell toggles notes, not the button", async ({ page }) => {
  await open(page, P.id);
  await page.getByRole("button", { name: "Check" }).click();
  await cell(page, firstEmpty(P)).click();
  await page.keyboard.press("Space");
  await expect(page.locator(".keypad .mode")).toHaveAttribute("aria-pressed", "true");
});

test("holding a digit key does not flip the cell back and forth", async ({ page }) => {
  await open(page, P.id);
  const i = firstEmpty(P);
  await cell(page, i).click();
  for (let k = 0; k < 4; k++) await page.keyboard.down("Digit7"); // later downs repeat
  await page.keyboard.up("Digit7");
  await expect(cell(page, i)).toHaveText("7");
});
