import { Controller } from "@hotwired/stimulus";

// Drives one split-flap cell: chains single flips into a reel that counts, in
// sequence, from the current position to a target and decelerates onto it.
//
// `value` is an integer POSITION into `alphabet` (0 = the first face). The default
// alphabet is sudoku's — position 0 = blank, 1..9 = digits — so the board's digit
// value doubles as its position. Other reels pass their own alphabet (e.g. a
// multi-digit number field uses ["", "0".."9"] so a 0 renders as "0", not blank).
//
// Direction couples counting order to the flip animation:
//   forward   -> count UP,   leaves flap DOWN
//   backtrack -> count DOWN, leaves flap UP
//
// The element is self-rendering: give it a bare `<div data-controller="flap">`
// and it builds its own layers, so a 9x9 board is 81 trivial divs.
export default class extends Controller {
  static values = {
    alphabet: {
      type: Array,
      default: ["", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    },
    value: { type: Number, default: 0 }, // current position into alphabet
    duration: { type: Number, default: 150 }, // base per-flip ms
    settle: { type: Number, default: 3 }, // trailing flips that decelerate
    settleFactor: { type: Number, default: 2.4 }, // duration multiplier at the last flip
  };

  connect() {
    this.buildDom();
    this.current = this.valueValue;
    this.paintStatic(this.current);
    this.queue = Promise.resolve();
  }

  buildDom() {
    this.element.classList.add("flap");
    this.element.innerHTML = `
      <div class="flap__half flap__half--top"><span class="flap__char"></span></div>
      <div class="flap__half flap__half--bottom"><span class="flap__char"></span></div>
      <div class="flap__leaf flap__leaf--top"><span class="flap__char"></span></div>
      <div class="flap__leaf flap__leaf--bottom"><span class="flap__char"></span></div>`;
    const [topHalf, bottomHalf, topLeaf, bottomLeaf] =
      this.element.querySelectorAll(".flap__char");
    Object.assign(this, { topHalf, bottomHalf, topLeaf, bottomLeaf });
  }

  glyph(pos) {
    return this.alphabetValue[pos] ?? "";
  }

  // Rest state: both statics show `n`, leaves cleared.
  paintStatic(n) {
    const g = this.glyph(n);
    this.topHalf.textContent = g;
    this.bottomHalf.textContent = g;
    this.element.classList.remove("flap--down", "flap--up");
  }

  // Jump to a value with no animation (initial render, reset, scrub).
  set(n) {
    this.current = n;
    this.valueValue = n;
    this.paintStatic(n);
  }

  // Public entry point. Serializes concurrent calls so a cell can't flip two
  // reels at once. Returns a promise that resolves when the cell has settled.
  flapTo(target, direction) {
    this.queue = this.queue.then(() => this.runReel(target, direction));
    return this.queue;
  }

  async runReel(target, direction) {
    if (this.prefersReducedMotion) {
      this.set(target);
      this.settled(target);
      return;
    }
    const steps = this.sequence(this.current, target, direction);
    for (let i = 0; i < steps.length; i++) {
      const remaining = steps.length - 1 - i;
      await this.flipOnce(this.current, steps[i], direction, this.durationFor(remaining));
      this.current = steps[i];
      this.valueValue = steps[i];
    }
    this.settled(target);
  }

  // The intermediate glyphs to pass through, in order.
  sequence(from, to, direction) {
    const out = [];
    if (direction === "backtrack") {
      for (let n = from - 1; n >= to; n--) out.push(n);
    } else {
      for (let n = from + 1; n <= to; n++) out.push(n);
    }
    return out;
  }

  // Constant base speed, ramping longer over the last `settle` flips so the cell
  // eases to rest instead of stopping dead — the "arriving" feel.
  durationFor(remaining) {
    const s = this.settleValue;
    if (remaining >= s) return this.durationValue;
    const t = (s - remaining) / s; // 0 -> 1 across the final flips
    return Math.round(this.durationValue * (1 + (this.settleFactorValue - 1) * t));
  }

  // One card flip from glyph `from` to glyph `to`. Sets up the leaves and swaps
  // one static BEFORE animating so nothing flashes, then commits the other static
  // when the finishing leaf lands.
  flipOnce(from, to, direction, dur) {
    return new Promise((resolve) => {
      const down = direction !== "backtrack";
      const fromG = this.glyph(from);
      const toG = this.glyph(to);
      this.element.style.setProperty("--flap-dur", `${dur}ms`);

      if (down) {
        this.topLeaf.textContent = fromG; // outgoing top, will fall away
        this.bottomLeaf.textContent = toG; // incoming bottom, will drop in
        this.topHalf.textContent = toG; // revealed behind the falling leaf
        // bottomHalf stays fromG until the bottom leaf lands
      } else {
        this.bottomLeaf.textContent = fromG; // outgoing bottom, will lift away
        this.topLeaf.textContent = toG; // incoming top, will drop down
        this.bottomHalf.textContent = toG; // revealed behind the lifting leaf
        // topHalf stays fromG until the top leaf lands
      }

      void this.element.offsetHeight; // flush setup before the animation starts
      const cls = down ? "flap--down" : "flap--up";
      this.element.classList.add(cls);

      const finisher = down ? this.bottomLeaf.parentElement : this.topLeaf.parentElement;
      const onEnd = (e) => {
        if (e.target !== finisher) return;
        finisher.removeEventListener("animationend", onEnd);
        if (down) this.bottomHalf.textContent = toG;
        else this.topHalf.textContent = toG;
        this.element.classList.remove(cls);
        resolve();
      };
      finisher.addEventListener("animationend", onEnd);
    });
  }

  settled(value) {
    this.dispatch("settled", { detail: { value } });
  }

  get prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
}
