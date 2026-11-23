// @ts-check
/**
 * Keyboard handling (contracts/ui.md "Keyboard"). Digits are matched by
 * physical key (`code`), because Shift+5 gives `%` and Option+digit gives
 * symbols on macOS (research R7).
 */

/**
 * @typedef {object} InputActions
 * @property {(dRow: number, dCol: number) => void} move
 * @property {(d: number, asCandidate: boolean) => void} digit
 * @property {() => void} clear
 * @property {() => void} undo
 * @property {() => void} redo
 * @property {() => void} toggleMode
 * @property {() => void} togglePause
 */

const ARROWS = /** @type {Record<string, [number, number]>} */ ({
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
});

/**
 * @param {InputActions} act
 * @param {() => boolean} [enabled] false while a dialog is open
 */
export function bindKeyboard(act, enabled = () => true) {
  document.addEventListener("keydown", (e) => {
    if (!enabled() || e.isComposing) return;
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.closest?.("input, select, textarea, dialog")) return;
    const button = t.closest?.("button");
    const cmd = e.metaKey || e.ctrlKey;
    // A held key repeats; only movement should, since digits, N, P and
    // undo/redo act once per press.
    if (e.repeat && !ARROWS[e.key]) return;

    if (cmd && !e.altKey && e.code === "KeyZ") {
      e.preventDefault();
      if (e.shiftKey) act.redo();
      else act.undo();
      return;
    }
    if (e.ctrlKey && !e.metaKey && e.code === "KeyY") {
      e.preventDefault();
      act.redo();
      return;
    }
    // Leave other shortcuts (copy, reload, tab switch) to the browser.
    if (cmd || e.altKey) return;

    // Synthetic keys (on-screen keyboards, remote desktops) may lack a
    // physical code, so fall back to the character.
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code) ?? /^([1-9])$/.exec(e.key);
    if (m) {
      e.preventDefault();
      button?.blur();
      act.digit(Number(m[1]), e.shiftKey);
      return;
    }
    if (ARROWS[e.key]) {
      e.preventDefault();
      // Playing on the board ends a button's focus, so a later Space toggles
      // notes instead of pressing that button again.
      button?.blur();
      act.move(...ARROWS[e.key]);
      return;
    }
    switch (e.key) {
      case "Backspace":
      case "Delete":
        e.preventDefault();
        act.clear();
        return;
      case " ":
        // Space on a focused button activates that button instead.
        if (button) return;
        e.preventDefault();
        act.toggleMode();
        return;
    }
    if (e.code === "KeyN") act.toggleMode();
    else if (e.code === "KeyP") act.togglePause();
  });
}
