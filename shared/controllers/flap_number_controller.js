import { Controller } from "@hotwired/stimulus";

// A right-aligned row of split-flap digit cells that displays a whole number.
// Reuses the `flap` controller for each digit, with a number alphabet so that a
// 0 renders as "0" (position 1) and unused leading positions sit blank (position
// 0). Give it a bare `<div data-controller="flap-number" data-flap-number-digits-value="4">`
// and it builds its own cells.
//
//   digit d  -> flap position d + 1
//   blank    -> flap position 0
const NUMBER_ALPHABET = ["", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default class extends Controller {
  static values = {
    digits: { type: Number, default: 4 },
    duration: { type: Number, default: 90 },
  };

  connect() {
    this.build();
  }

  build() {
    this.element.classList.add("flap-number");
    const alphabet = JSON.stringify(NUMBER_ALPHABET);
    this.element.innerHTML = Array.from(
      { length: this.digitsValue },
      () =>
        `<div data-controller="flap" data-flap-alphabet-value='${alphabet}' ` +
        `data-flap-duration-value="${this.durationValue}" data-flap-value-value="0"></div>`,
    ).join("");
    this.cells = [...this.element.children];
  }

  cell(el) {
    return this.application.getControllerForElementAndIdentifier(el, "flap");
  }

  // Right-align `n` into the field; unused leading slots become spaces (blanks).
  format(n) {
    return String(n).padStart(this.digitsValue, " ").slice(-this.digitsValue);
  }

  position(ch) {
    return ch === " " ? 0 : Number(ch) + 1;
  }

  // Instant, no animation (initial render, reset, scrub).
  set(n) {
    const s = this.format(n);
    this.cells.forEach((el, i) => this.cell(el)?.set(this.position(s[i])));
  }

  clear() {
    this.cells.forEach((el) => this.cell(el)?.set(0));
  }

  // Animate every digit concurrently to display `n`; resolves when all settle.
  flapTo(n) {
    const s = this.format(n);
    return Promise.all(
      this.cells.map((el, i) => {
        const ctrl = this.cell(el);
        if (!ctrl) return Promise.resolve();
        const target = this.position(s[i]);
        const direction = target >= ctrl.current ? "forward" : "backtrack";
        return ctrl.flapTo(target, direction);
      }),
    );
  }
}
