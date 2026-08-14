# Visuals

Interactive, zoomable explainers of how things work — algorithms, protocols, and the journey of a message across the web.

**[▶ Live demo](https://benkicode.github.io/visuals/)**

## Why

Most explanations of a protocol or an algorithm are a static diagram and a wall
of text. This is the opposite: each visualization is a small, interactive movie
you can play, step, and scrub — showing a real scenario at the level a user
actually meets it (a padlock closing in the address bar), then zooming down to
the mechanism underneath (the modular arithmetic of a Diffie–Hellman key
exchange).

Opening Wikipedia is not the same journey as opening YouTube, Netflix, or a game
— different protocols, different hops. The long-term aim is to build these
chapters as composable pieces and stitch them into one capstone: everything that
happens when you type `google.com` and press enter.

Everything is pure CSS with a little Stimulus — no animation libraries, no heavy
framework — so each piece stays light, self-contained, and easy to read.

## Visualizations

|      | Visualization | What it shows |
| ---- | ------------- | ------------- |
| Live | [Sudoku · backtracking](https://benkicode.github.io/visuals/visualizations/sudoku/) | A solver searches, filling cells as split-flaps and erasing them on backtrack; switch algorithms and watch the thrash change. |
| Live | [Key exchange · Diffie–Hellman](https://benkicode.github.io/visuals/visualizations/key-exchange/) | How a secure channel appears — from the browser padlock down to the shared-secret arithmetic of the TLS 1.3 handshake. |
| Soon | DNS lookup | A name resolves, hop by hop, from resolver to authoritative server. |
| Soon | TCP handshake | SYN, SYN-ACK, ACK — a connection comes to life. |
| Soon | HTTPS certificate validation | Walking the chain of trust from leaf to root CA. |
| Soon | HTTP through Rails | A request descends the middleware stack to your controller. |
| Soon | Typing google.com | The capstone: every chapter above, stitched into one journey. |

## How it's built

- **Pure CSS** for every visual and animation — no animation libraries. State is
  driven by class toggles; motion is keyframes and transitions.
- **[Stimulus](https://stimulus.hotwired.dev/)** for the sprinkle of interaction
  (play / step / scrub controls, algorithm switching).
- **[Vite](https://vitejs.dev/)** multi-page build — one HTML entry per
  visualization, `base: '/visuals/'` for project Pages.
- Deployed to **GitHub Pages** on every push to `main`
  (`.github/workflows/deploy.yml`).

## Run locally

```bash
npm install
npm run dev        # Vite dev server
```

```bash
npm run build      # production build to dist/
npm run preview    # serve the build
npm run lint       # ESLint
```

## Repository layout

```
index.html                 gallery landing page
visualizations/<name>/     one folder per visualization
  index.html               its entry page
  main.js                  Stimulus bootstrap
  controllers/             Stimulus controllers
  lib/                     pure logic (no DOM)
  styles/                  CSS
shared/                    components reused across visualizations
vite.config.js             multi-page build config
```

## Conventions

Contributor conventions live in [`AGENTS.md`](AGENTS.md) — notably the module
export rules (named exports under `lib/**`, a default-exported controller under
`controllers/*`), enforced by ESLint in CI. A tracked `pre-push` hook
(`.githooks/`) blocks accidentally pushing debug scaffolding.
