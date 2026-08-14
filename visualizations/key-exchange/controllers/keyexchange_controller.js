import { Controller } from "@hotwired/stimulus";
import { buildScenes } from "../lib/dh.js";

// Plays the TLS 1.3 handshake as one timeline: each step narrates, flaps its
// number fields into place, and flips `s-*` state classes on the panel (which
// the CSS uses to reveal cards, light the network wires, close the padlock…).
const INTRO =
  "How a browser and server build a secure channel over an open connection — the TLS 1.3 handshake, step by step.";

export default class extends Controller {
  static targets = ["narration", "scrub", "play", "panel"];

  connect() {
    this.playing = false;
    this.cursor = 0;
    this.steps = buildScenes().steps;
    this.scrubTarget.max = String(this.steps.length);
    this.renderAt(0);
  }

  disconnect() {
    this.playing = false;
  }

  field(name) {
    return this.panelTarget.querySelector(`[data-field="${name}"]`);
  }

  // Reveal a value with a small pop (re-triggered by reflow so replays animate).
  setVal(name, value) {
    const el = this.field(name);
    if (!el) return;
    el.textContent = value;
    el.classList.remove("val--pop");
    void el.offsetWidth;
    el.classList.add("val--pop");
  }

  wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ---- playback ----

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  async play() {
    if (this.playing || this.cursor >= this.steps.length) return;
    this.playing = true;
    this.setPlayLabel();
    while (this.playing && this.cursor < this.steps.length) {
      await this.applyStep(this.steps[this.cursor]);
      if (!this.playing) break;
      this.cursor++;
      this.syncScrub();
      await this.wait(500);
    }
    this.playing = false;
    this.setPlayLabel();
  }

  pause() {
    this.playing = false;
    this.setPlayLabel();
  }

  async stepForward() {
    this.pause();
    if (this.cursor >= this.steps.length) return;
    await this.applyStep(this.steps[this.cursor]);
    this.cursor++;
    this.syncScrub();
  }

  stepBack() {
    this.pause();
    if (this.cursor > 0) this.renderAt(this.cursor - 1);
  }

  restart() {
    this.renderAt(0);
  }

  toEnd() {
    this.renderAt(this.steps.length);
  }

  async applyStep(step) {
    this.narrationTarget.textContent = step.narration;
    const panel = this.panelTarget;
    if (step.classes) step.classes.forEach((c) => panel.classList.add(c));
    if (step.symmetric) panel.classList.add("s-symmetric");
    this.scrollToFocus(step, "smooth");
    if (step.set) {
      for (const [name, value] of Object.entries(step.set)) this.setVal(name, value);
      await this.wait(320);
    }
  }

  // Keep the active card in view as the timeline advances — otherwise the reveal
  // happens below the fold and the page looks stuck.
  scrollToFocus(step, behavior) {
    if (!step?.focus) return;
    this.panelTarget.querySelector(step.focus)?.scrollIntoView({ behavior, block: "center" });
  }

  // Instant jump to the state after `k` steps (scrub / step-back / restart / end).
  renderAt(k) {
    this.pause();
    const panel = this.panelTarget;
    panel.className = panel.className
      .split(/\s+/)
      .filter((c) => !c.startsWith("s-"))
      .join(" ");
    panel.querySelectorAll("[data-field]").forEach((el) => {
      el.textContent = "";
      el.classList.remove("val--pop");
    });
    for (let i = 0; i < k; i++) {
      const step = this.steps[i];
      if (step.classes) step.classes.forEach((c) => panel.classList.add(c));
      if (step.symmetric) panel.classList.add("s-symmetric");
      if (step.set) for (const [n, v] of Object.entries(step.set)) {
        const el = this.field(n);
        if (el) el.textContent = v;
      }
    }
    this.cursor = k;
    this.narrationTarget.textContent = k === 0 ? INTRO : this.steps[k - 1].narration;
    if (k > 0) this.scrollToFocus(this.steps[k - 1], "auto");
    this.syncScrub();
  }

  // ---- control panel ----

  onScrub() {
    this.renderAt(Number(this.scrubTarget.value));
  }

  syncScrub() {
    if (!this.steps) return;
    this.scrubTarget.value = String(this.cursor);
    const atEnd = this.cursor >= this.steps.length;
    this.playTarget.textContent = this.playing ? "Pause" : atEnd ? "Replay" : "Play";
  }

  setPlayLabel() {
    this.syncScrub();
  }
}
