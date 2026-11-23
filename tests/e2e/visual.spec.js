import { expect, test } from "@playwright/test";
import { cell, firstEmpty, isDesktop, open, puzzle, type } from "./helpers.js";

const P = puzzle(100001);

// One baseline per engine; cross-engine parity is checked by hand (T066).
for (const scheme of ["light", "dark"]) {
  test(`board in ${scheme} theme`, async ({ page }, info) => {
    test.skip(!isDesktop(info.project.name), "desktop engines only");
    // Baselines exist only for macOS (*-darwin.png); CI runs on Linux.
    test.skip(process.platform !== "darwin", "screenshot baselines are macOS-only");
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, P.id);
    await type(page, firstEmpty(P, 0), P.solution[firstEmpty(P, 0)]);
    for (const d of [2, 5, 7]) await type(page, firstEmpty(P, 1), d, { candidate: true });
    await cell(page, firstEmpty(P, 2)).click();
    await expect(page.locator("#board")).toHaveScreenshot(`board-${scheme}.png`, { maxDiffPixelRatio: 0.01 });
  });
}
