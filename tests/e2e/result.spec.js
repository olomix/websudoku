import { expect, test } from "@playwright/test";
import { fill, firstEmpty, open, puzzle, stubClipboard, type } from "./helpers.js";

const P = puzzle(100001);

test("completion shows ID, level, time and clean label; share copies the text", async ({ page }) => {
  await stubClipboard(page);
  await open(page, P.id);
  await fill(page, P);
  const dlg = page.locator("dialog#completion");
  await expect(dlg.locator('[data-field="level"]')).toHaveText("Easy");
  await expect(dlg.locator('[data-field="result"]')).toHaveText("clean");
  await dlg.locator("#share").click();
  const [text] = await page.evaluate(() => window.__copied);
  expect(text).toMatch(new RegExp(`^Sudoku #${P.id} \\(Easy\\) — solved in \\d+:\\d\\d, clean\\n`));
  expect(text.split("\n")[1]).toBe(new URL(`/?id=${P.id}`, page.url()).href);
});

test("a check with mistakes makes the result assisted (US4 scenario 3)", async ({ page }) => {
  await open(page, P.id);
  const a = firstEmpty(P);
  await type(page, a, P.solution[a] === 9 ? 1 : 9);
  await page.getByRole("button", { name: "Check" }).click();
  await fill(page, P);
  await expect(page.locator('dialog#completion [data-field="result"]')).toHaveText("assisted");
});

test("solving the same ID again shows the personal best", async ({ page }) => {
  await open(page, P.id);
  await fill(page, P);
  const first = await page.locator('dialog#completion [data-field="time"]').textContent();
  await expect(page.locator('dialog#completion [data-field="your-best"]')).toContainText("(new)");
  // Another puzzle replaces the saved solved game, so this ID starts fresh.
  await open(page, 100002);
  await open(page, P.id);
  await fill(page, P);
  // Either solve may be faster; the best shown is the faster one, and it is
  // marked new only when the second solve beat the first.
  const secs = (t) => t.trim().split(":").reduce((a, x) => a * 60 + Number(x), 0);
  const second = await page.locator('dialog#completion [data-field="time"]').textContent();
  const best = page.locator('dialog#completion [data-field="your-best"]');
  if (secs(second) < secs(first)) {
    await expect(best).toHaveText(`${second.trim()} (new)`);
  } else {
    await expect(best).toHaveText(first.trim());
  }
});

test("new puzzle opens another puzzle of the same level", async ({ page }) => {
  await open(page, P.id);
  await fill(page, P);
  await page.locator("#new-puzzle").click();
  await expect(page).not.toHaveURL(/\?id=100001$/);
  await expect(page).toHaveURL(/\?id=1\d{5}$/);
  await expect(page.locator("dialog#completion")).toHaveCount(0);
  await expect(page.locator(".cell.user")).toHaveCount(0);
});

test("after a blocked share, Back returns to the completion dialog", async ({ page }) => {
  await stubClipboard(page, { fail: true });
  await open(page, P.id);
  await fill(page, P);
  await page.locator("dialog#completion #share").click();
  await expect(page.locator("dialog#copy-fallback textarea")).toHaveValue(/solved in/);
  await page.locator("dialog#copy-fallback").getByRole("button", { name: "Back" }).click();
  await expect(page.locator("dialog#completion")).toBeVisible();
  await expect(page.locator("dialog#completion #new-puzzle")).toBeVisible();
});
