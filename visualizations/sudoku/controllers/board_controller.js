import { Controller } from "@hotwired/stimulus";
import { solve, listStrategies, parsePuzzle } from "../lib/solver.js";
import { PUZZLES } from "../lib/puzzles.js";

// Owns the whole sudoku visualization: it solves the puzzle once, then plays the
// resulting event log through the split-flap cells. The event log is the only
// contract between solver and view, so switching strategy/puzzle is just a
// re-solve + reload. Playback is strictly one cell at a time — the board awaits
// each cell's `flap:settled` before advancing — so the solve reads as a sequence
// of individual squares arriving, with backtracking erasing them back out.
export default class extends Controller {
  static targets = ["grid", "status", "scrub", "play", "strategy", "puzzle", "speed"];
  static values = {
    puzzle: { type: String, default: "norvigEasy" },
    strategy: { type: String, default: "naive" },
  };

  baseFlip = 90; // ms per flip at 1x
  baseGap = 55; // ms between events at 1x

  connect() {
    this.populateSelectors();
    this.speed = 1;
    this.load();
  }

  disconnect() {
    this.playing = false;
  }

  // ---- setup ----------------------------------------------------------------

  populateSelectors() {
    this.strategyTarget.innerHTML = listStrategies()
      .map((s) => `<option value="${s.key}" title="${s.description}">${s.name}</option>`)
      .join("");
    this.strategyTarget.value = this.strategyValue;
    this.puzzleTarget.innerHTML = Object.entries(PUZZLES)
      .map(([key, p]) => `<option value="${key}">${p.name} · ${p.difficulty}</option>`)
      .join("");
    this.puzzleTarget.value = this.puzzleValue;
  }

  load() {
    this.playing = false;
    const puzzle = PUZZLES[this.puzzleValue];
    this.initial = parsePuzzle(puzzle.grid);
    this.result = solve(puzzle.grid, { strategy: this.strategyValue });
    this.events = this.result.events;
    this.cursor = 0;
    this.renderBoard();
    this.scrubTarget.max = String(this.events.length);
    this.scrubTarget.value = "0";
    this.renderAt(0);
    this.setPlayLabel();
    this.updateStatus();
  }

  renderBoard() {
    let html = "";
    for (let i = 0; i < 81; i++) {
      const given = this.result.givens[i];
      if (given) {
        html += `<div class="cell cell--given">${this.initial[i]}</div>`;
      } else {
        html += `<div class="cell cell--algo" data-controller="flap" data-flap-value-value="0"></div>`;
      }
    }
    this.gridTarget.innerHTML = html;
    this.cells = [...this.gridTarget.children];
  }

  flapAt(row, col) {
    const el = this.cells[row * 9 + col];
    return this.application.getControllerForElementAndIdentifier(el, "flap");
  }

  // ---- timing ---------------------------------------------------------------

  get flipMs() {
    return Math.max(16, Math.round(this.baseFlip / this.speed));
  }
  get gapMs() {
    return Math.round(this.baseGap / this.speed);
  }
  wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ---- playback -------------------------------------------------------------

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  async play() {
    if (this.playing || this.cursor >= this.events.length) return;
    this.playing = true;
    this.setPlayLabel();
    while (this.playing && this.cursor < this.events.length) {
      await this.animateEvent(this.events[this.cursor]);
      if (!this.playing) break; // paused mid-flip
      this.cursor++;
      this.syncScrub();
      this.updateStatus();
      await this.wait(this.gapMs);
    }
    this.playing = false;
    this.clearActive();
    this.setPlayLabel();
    this.updateStatus();
  }

  pause() {
    this.playing = false;
    this.setPlayLabel();
  }

  async stepForward() {
    this.pause();
    if (this.cursor >= this.events.length) return;
    await this.animateEvent(this.events[this.cursor]);
    this.cursor++;
    this.syncScrub();
    this.clearActive();
    this.updateStatus();
  }

  stepBack() {
    this.pause();
    if (this.cursor === 0) return;
    this.renderAt(this.cursor - 1);
  }

  restart() {
    this.pause();
    this.renderAt(0);
  }

  toEnd() {
    this.pause();
    this.renderAt(this.events.length);
  }

  // Animate a single event on its cell; resolves when the cell settles.
  animateEvent(ev) {
    const cell = this.flapAt(ev.row, ev.col);
    if (!cell) return Promise.resolve();
    cell.durationValue = this.flipMs;
    cell.settleValue = 2;
    this.setActive(ev.row, ev.col, ev.kind);
    const dir = ev.kind === "fill" ? "forward" : "backtrack";
    return cell.flapTo(ev.value, dir);
  }

  // Jump (no animation) to the board state after `k` events — for scrub, step
  // back, restart, and jump-to-end. Replays instant `set()`s from blank.
  renderAt(k) {
    this.pause();
    for (const cell of this.cells) {
      if (cell.classList.contains("cell--algo")) {
        this.application.getControllerForElementAndIdentifier(cell, "flap")?.set(0);
      }
    }
    for (let i = 0; i < k; i++) {
      const ev = this.events[i];
      this.flapAt(ev.row, ev.col)?.set(ev.value);
    }
    this.cursor = k;
    this.clearActive();
    this.syncScrub();
    this.updateStatus();
  }

  // ---- control-panel events -------------------------------------------------

  onScrub() {
    this.renderAt(Number(this.scrubTarget.value));
  }
  onSpeed() {
    this.speed = Number(this.speedTarget.value);
    this.updateStatus();
  }
  onStrategy() {
    this.strategyValue = this.strategyTarget.value;
    this.load();
  }
  onPuzzle() {
    this.puzzleValue = this.puzzleTarget.value;
    this.load();
  }

  // ---- view bits ------------------------------------------------------------

  setActive(row, col, kind) {
    this.clearActive();
    const el = this.cells[row * 9 + col];
    el.classList.add(kind === "fill" ? "is-fill" : "is-erase");
    this.activeEl = el;
  }
  clearActive() {
    this.activeEl?.classList.remove("is-fill", "is-erase");
    this.activeEl = null;
  }

  syncScrub() {
    this.scrubTarget.value = String(this.cursor);
  }
  setPlayLabel() {
    const atEnd = this.cursor >= this.events.length;
    this.playTarget.textContent = this.playing ? "Pause" : atEnd ? "Replay" : "Play";
  }

  updateStatus() {
    const total = this.events.length;
    const name = this.strategyTarget.selectedOptions[0]?.textContent ?? "";
    const done = this.cursor >= total;
    const tail = done
      ? this.result.solved
        ? "solved ✓"
        : "stopped"
      : `${this.speed}× speed`;
    this.statusTarget.textContent = `${name} · step ${this.cursor} / ${total} · ${tail}`;
    if (this.playTarget) this.setPlayLabel();
  }
}
