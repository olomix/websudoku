// @ts-check
/**
 * Active-time clock (research R8). Sums running intervals measured with a
 * monotonic clock, so paused or hidden time is never counted.
 */
export class Timer {
  /** @param {() => number} [now] monotonic milliseconds */
  constructor(now = () => performance.now()) {
    this.now = now;
    /** @type {number} time banked from finished intervals */
    this.banked = 0;
    /** @type {number | null} start of the running interval */
    this.since = null;
  }

  get running() {
    return this.since !== null;
  }

  start() {
    if (this.since === null) this.since = this.now();
  }

  stop() {
    if (this.since !== null) {
      this.banked += this.now() - this.since;
      this.since = null;
    }
  }

  /** @returns {number} whole milliseconds of active time */
  elapsed() {
    const live = this.since === null ? 0 : this.now() - this.since;
    return Math.floor(this.banked + live);
  }

  /** @param {number} ms */
  set(ms) {
    this.banked = Math.max(0, ms);
    if (this.since !== null) this.since = this.now();
  }
}

/**
 * `m:ss`, or `h:mm:ss` from one hour.
 * @param {number} ms
 */
export function formatTime(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
