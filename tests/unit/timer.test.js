import { describe, expect, it } from "vitest";
import { Timer, formatTime } from "../../web/js/core/timer.js";
import { fakeClock, newGame } from "./helpers.js";

describe("timer", () => {
  it("sums only running intervals", () => {
    const now = fakeClock();
    const t = new Timer(now);
    t.start();
    now.advance(1500);
    t.stop();
    now.advance(10_000);
    t.start();
    now.advance(500);
    expect(t.elapsed()).toBe(2000);
  });

  it("can be set to a saved value", () => {
    const now = fakeClock();
    const t = new Timer(now);
    t.set(61_000);
    t.start();
    now.advance(1000);
    expect(t.elapsed()).toBe(62_000);
  });

  it("formats m:ss and h:mm:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(7 * 60_000 + 42_000)).toBe("7:42");
    expect(formatTime(3_600_000 + 5 * 60_000 + 3000)).toBe("1:05:03");
  });

  it("stays accurate over an hour (SC-006)", () => {
    const now = fakeClock();
    const t = new Timer(now);
    t.start();
    for (let k = 0; k < 3600; k++) now.advance(1000.0001);
    expect(Math.abs(t.elapsed() - 3_600_000)).toBeLessThan(1000);
  });
});

describe("pause rules", () => {
  it("does not count hidden time", () => {
    const now = fakeClock();
    const g = newGame(now);
    now.advance(1000);
    g.pause("hidden");
    now.advance(60_000);
    g.resume("hidden");
    now.advance(1000);
    expect(g.elapsedMs).toBe(2000);
  });

  it("page visible does not resume a user pause", () => {
    const now = fakeClock();
    const g = newGame(now);
    g.pause("user");
    expect(g.resume("hidden")).toBe(false);
    expect(g.status).toBe("paused");
    expect(g.resume("user")).toBe(true);
    expect(g.status).toBe("playing");
  });

  it("ignores edits while paused", () => {
    const g = newGame();
    g.pause("user");
    expect(g.setValue(2, 4)).toBe(false);
  });
});
