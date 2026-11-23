import { expect, test } from "@playwright/test";
import { open } from "./helpers.js";

const boardBg = (page) => page.locator("#board").evaluate((e) => getComputedStyle(e).backgroundColor);
const LIGHT = "rgb(61, 74, 92)"; // style B frame color
const DARK = "rgb(20, 22, 26)"; // style D board color

test("follows the device color scheme by default", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page, 100001);
  expect(await boardBg(page)).toBe(LIGHT);
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await boardBg(page)).toBe(DARK);
});

test("a manual theme overrides the device and is kept after reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page, 100001);
  await page.locator("#theme").selectOption("dark");
  expect(await boardBg(page)).toBe(DARK);
  await page.reload();
  await expect(page.locator(".cell")).toHaveCount(81);
  expect(await boardBg(page)).toBe(DARK);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.locator("#theme").selectOption("light");
  expect(await boardBg(page)).toBe(LIGHT);
});

test("the conflict switch hides conflict highlights", async ({ page }) => {
  await open(page, 100001);
  const i = await page.locator(".cell:not(.given)").first().getAttribute("data-i");
  const given = await page.locator(".cell.given").first().textContent();
  await page.locator(`.cell[data-i="${i}"]`).click();
  // A digit that already appears as a given somewhere conflicts at least once
  // when placed in the same unit; use the 5 trick: fill every digit until one conflicts.
  for (let d = 1; d <= 9; d++) {
    await page.keyboard.press(`Digit${d}`);
    if (await page.locator(".cell.conflict").count()) break;
  }
  expect(given).toBeTruthy();
  await expect(page.locator(".cell.conflict").first()).toBeVisible();
  await page.locator("#conflicts").uncheck();
  await expect(page.locator(".cell.conflict")).toHaveCount(0);
});
