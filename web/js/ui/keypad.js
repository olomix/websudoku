// @ts-check
/**
 * On-screen keypad. Buttons only, never inputs, so iOS Safari does not
 * open its keyboard or zoom (research R7).
 */

/**
 * @param {HTMLElement} root
 * @param {object} act
 * @param {(d: number) => void} act.digit
 * @param {() => void} act.clear
 * @param {() => void} act.toggleMode
 * @param {() => void} act.undo
 * @param {() => void} act.redo
 */
export function createKeypad(root, act) {
  const btn = (/** @type {string} */ label, /** @type {string} */ cls, /** @type {() => void} */ fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = label;
    // Keep keyboard focus on the page so digits keep working after a tap.
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.addEventListener("click", fn);
    return b;
  };
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
    const b = btn(String(d), "digit", () => act.digit(d));
    b.dataset.digit = String(d);
    b.setAttribute("aria-label", `Digit ${d}`);
    return b;
  });
  const mode = btn("Notes: off", "btn mode", act.toggleMode);
  mode.setAttribute("aria-pressed", "false");
  mode.title = "Candidate mode (N or Space)";
  const undo = btn("Undo", "btn undo", act.undo);
  const redo = btn("Redo", "btn redo", act.redo);
  const clear = btn("Clear", "btn clear", act.clear);
  const tools = document.createElement("div");
  tools.className = "tools";
  tools.append(mode, clear, undo, redo);
  root.replaceChildren(...digits, tools);

  /**
   * @param {{ candidateMode: boolean, canUndo: boolean, canRedo: boolean }} v
   */
  function render(v) {
    root.classList.toggle("candidate-mode", v.candidateMode);
    mode.setAttribute("aria-pressed", String(v.candidateMode));
    mode.textContent = v.candidateMode ? "Notes: on" : "Notes: off";
    undo.disabled = !v.canUndo;
    redo.disabled = !v.canRedo;
  }
  return { render };
}
