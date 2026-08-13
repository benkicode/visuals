# visuals — conventions

A gallery of interactive "how it works" visualizations (algorithms, protocols, the
journey of a web request), deployed to GitHub Pages. Pure CSS for visuals/animation
(no animation libraries), Stimulus for JS, Vite multi-page build (`base: '/visuals/'`,
one HTML entry per visualization).

## Module exports

- **Utility / library modules** (e.g. `**/lib/**`): use **named exports** only — no
  default exports. Named exports keep import identifiers consistent, refactor cleanly,
  and read explicitly.
- **Stimulus controllers** (`**/controllers/*.js`): one controller per file as
  `export default class extends Controller`. This is the Stimulus convention and what
  its loading expects — the one place a default export is correct.

Enforced by ESLint (`eslint-plugin-import-x`, run in CI): `no-default-export` under
`lib/**`, `no-named-export` under `controllers/*`.
