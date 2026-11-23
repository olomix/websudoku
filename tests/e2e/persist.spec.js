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

test("a manual pause survives a reload", async ({ page }) => {
  await open(page, P.id);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.locator("#board")).toBeHidden();
  await page.reload();
  await expect(page.locator(".info .id")).toHaveText(`#${P.id}`);
  await expect(page.locator("#board")).toBeHidden();
  await expect(page.locator("#paused-cover")).toBeVisible();
});

test("a newer save from another tab replaces this tab's older board", async ({ page, context }) => {
  await open(page, P.id);
  const other = await context.newPage();
  await open(other, P.id);
  const a = firstEmpty(P);
  await type(other, a, 8);
  await expect(cell(page, a)).toHaveText("8");
  await other.close();
  await page.reload();
  await expect(cell(page, a)).toHaveText("8");
});

test("a catalog that cannot load does not replace the saved game", async ({ page }) => {
  await open(page, 300001);
  const p = puzzle(300001);
  const a = firstEmpty(p);
  await type(page, a, 8);
  await page.route("**/puzzles/level-3.json", (r) => r.abort());
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("could not");
  await page.unroute("**/puzzles/level-3.json");
  await page.goto("/");
  await expect(page.locator(".info .id")).toHaveText("#300001");
  await expect(cell(page, a)).toHaveText("8");
});

test("an echo save of the same board keeps this tab's undo history", async ({ page, context }) => {
  await open(page, P.id);
  const other = await context.newPage();
  await open(other, P.id);
  const a = firstEmpty(P);
  await type(page, a, 8);
  await expect(cell(other, a)).toHaveText("8");
  // The other tab saves the same board when it is hidden.
  await other.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(cell(page, a)).toHaveAttribute("data-value", "0");
});

test("a tab that cannot load another tab's newer game says so and recovers", async ({ page, context }) => {
  await open(page, P.id);
  await page.route("**/puzzles/level-3.json", (r) => r.abort());
  const other = await context.newPage();
  await open(other, 300001);
  await expect(page.locator("#message")).toContainText("changed in another tab");
  const a = firstEmpty(P);
  await type(page, a, 8);
  await expect(cell(page, a)).toHaveAttribute("data-value", "0");
  await page.unroute("**/puzzles/level-3.json");
  await type(page, a, 8);
  await expect(page.locator(".info .id")).toHaveText("#300001");
});
