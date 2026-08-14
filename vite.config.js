import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Multi-page build. Each visualization is its own HTML entry; `base` matches the
// GitHub Pages project path (https://<user>.github.io/visuals/). Add a line to
// `input` per new visualization.
const page = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: "/visuals/",
  build: {
    target: "es2022",
    outDir: "dist",
    rollupOptions: {
      input: {
        main: page("./index.html"),
        sudoku: page("./visualizations/sudoku/index.html"),
        keyExchange: page("./visualizations/key-exchange/index.html"),
      },
    },
  },
});
