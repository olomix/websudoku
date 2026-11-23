import { expect, test } from "@playwright/test";
import { open, puzzle, stubClipboard } from "./helpers.js";

test("each level button opens a random puzzle of that level", async ({ page }) => {
  await open(page);
  for (const [name, digit] of [["Moderate", 2], ["Hard", 3], ["Evil", 4], ["Easy", 1]]) {
    await page.locator(".levels button", { hasText: name }).click();
    await expect(page).toHaveURL(new RegExp(`\\?id=${digit}\\d{5}$`));
    await expect(page.locator(".info")).toContainText(name);
  }
});

test("opening an ID by address shows exactly that grid", async ({ page }) => {
  const p = puzzle(300001);
  await open(page, p.id);
  await expect(page.locator(".info")).toContainText("Hard");
  const values = await page.locator(".cell").evaluateAll((els) =>
    els.map((e) => [Number(e.dataset.i), Number(e.dataset.value)]).sort((a, b) => a[0] - b[0]).map((x) => x[1]));
  expect(values).toEqual(p.givens);
});

test("the puzzle number field opens a puzzle", async ({ page }) => {
  await open(page, 100001);
  await page.getByLabel("Puzzle number").fill("400 002");
  await page.getByRole("button", { name: "Go" }).click();
  await expect(page).toHaveURL(/\?id=400002$/);
  await expect(page.locator(".info")).toContainText("Evil");
});

test("an unknown ID shows not found and keeps the game", async ({ page }) => {
  await open(page, 100001);
  await page.locator('.cell:not(.given)').first().click();
  await page.keyboard.press("Digit1");
  await page.getByLabel("Puzzle number").fill("999999");
  await page.getByRole("button", { name: "Go" }).click();
  await expect(page.locator("dialog#not-found")).toBeVisible();
  await page.locator("dialog#not-found").getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\?id=100001$/);
  await expect(page.locator('.cell.user')).toHaveCount(1);
});

test("a malformed ID in the address shows not found and offers a random puzzle", async ({ page }) => {
  await page.goto("/?id=abc");
  await expect(page.locator("dialog#not-found")).toBeVisible();
  await page.locator("#random-puzzle").click();
  await expect(page).toHaveURL(/\?id=\d{6}$/);
});

test("copy link puts the puzzle link on the clipboard", async ({ page }) => {
  await stubClipboard(page);
  await open(page, 200005);
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.locator("#message")).toHaveText("Link copied.");
  const copied = await page.evaluate(() => window.__copied);
  expect(copied).toEqual([new URL("/?id=200005", page.url()).href]);
});

test("copy falls back to a text field when the clipboard is blocked", async ({ page }) => {
  await stubClipboard(page, { fail: true });
  await open(page, 200005);
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.locator("dialog#copy-fallback textarea")).toHaveValue(/\?id=200005$/);
});

test("a level that cannot load keeps the board and says so", async ({ page }) => {
  await open(page, 100001);
  await page.route("**/puzzles/level-4.json", (r) => r.abort());
  await page.locator(".levels button", { hasText: "Evil" }).click();
  await expect(page.locator("#message")).toContainText("could not load");
  await expect(page).toHaveURL(/\?id=100001$/);
});

test("a slow older level choice does not replace a newer one", async ({ page }) => {
  await open(page, 100001);
  await page.route("**/puzzles/level-3.json", async (r) => {
    await new Promise((res) => setTimeout(res, 1500));
    await r.continue();
  });
  await page.locator(".levels button", { hasText: "Hard" }).click();
  await page.locator(".levels button", { hasText: "Moderate" }).click();
  await expect(page).toHaveURL(/\?id=2\d{5}$/);
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/\?id=2\d{5}$/);
});
