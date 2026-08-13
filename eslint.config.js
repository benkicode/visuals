import js from "@eslint/js";
import globals from "globals";
import importX from "eslint-plugin-import-x";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    plugins: { "import-x": importX },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // build/dev tooling and the solver measurement harness run under Node
    files: ["vite.config.js", "eslint.config.js", "**/measure.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // library/utility modules: named exports only
    files: ["**/lib/**/*.js"],
    rules: { "import-x/no-default-export": "error" },
  },
  {
    // Stimulus controllers: one controller per file as a default export
    files: ["**/controllers/*.js"],
    rules: { "import-x/no-named-export": "error" },
  },
];
