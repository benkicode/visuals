import { Application } from "@hotwired/stimulus";
import FlapController from "./controllers/flap_controller.js";

const app = Application.start();
app.register("flap", FlapController);

const ctrl = (el) => app.getControllerForElementAndIdentifier(el, "flap");
const hero = () => ctrl(document.querySelector("#hero div"));
const strip = () => [...document.querySelectorAll("#strip div")].map(ctrl);

// expose for console-driven inspection during development
window.__lab = { app, hero, strip };

// deterministic pseudo-random so runs are repeatable
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const acts = {
  fill9: () => hero().flapTo(9, "forward"),
  fill3: () => hero().flapTo(3, "forward"),
  erase: () => hero().flapTo(0, "backtrack"),
  down1: () => {
    const c = hero();
    if (c.current < 9) c.flapTo(c.current + 1, "forward");
  },
  stripFill: () =>
    strip().forEach((c) => {
      const v = 1 + Math.floor(rand() * 9);
      if (v > c.current) c.flapTo(v, "forward");
    }),
  stripErase: () => strip().forEach((c) => c.flapTo(0, "backtrack")),
  demo: runDemo,
};

document.querySelectorAll("button").forEach((b) =>
  b.addEventListener("click", () => acts[b.dataset.act]?.()),
);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let demoRunning = false;
async function runDemo() {
  if (demoRunning) return;
  demoRunning = true;
  const h = hero();
  for (let k = 0; k < 4; k++) {
    await h.flapTo(9, "forward");
    await wait(400);
    await h.flapTo(0, "backtrack");
    await wait(250);
    await h.flapTo(4, "forward");
    await wait(250);
    await h.flapTo(7, "forward");
    await wait(400);
    await h.flapTo(0, "backtrack");
    await wait(400);
  }
  demoRunning = false;
}
