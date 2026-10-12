const js = require("@eslint/js");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const globals = require("globals");

// vitest's `globals: true` (see vitest.config.js) injects these at runtime -
// declared here so ESLint doesn't flag them as undefined in test files.
const vitestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  vi: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
  beforeAll: "readonly",
  afterAll: "readonly",
};

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "client/node_modules/**",
      "client/dist/**",
      "server/data/**",
      "playwright-report/**",
      "test-results/**",
      "e2e/fixtures/**",
    ],
  },

  js.configs.recommended,

  // Server: plain Node CommonJS.
  {
    files: ["server/**/*.js", "scripts/**/*.js", "*.config.js", ".claude/hooks/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      ecmaVersion: 2022,
      globals: { ...globals.node, ...vitestGlobals },
    },
  },

  // e2e specs: Node/CommonJS (the Playwright test runner), but
  // page.evaluate(() => ...) callbacks execute *in the browser*, so both
  // global sets are legitimately in play within the same file.
  {
    files: ["e2e/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // Client: React/JSX, browser + module.
  {
    files: ["client/src/**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...vitestGlobals, __APP_VERSION__: "readonly" },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules, // Vite's automatic JSX runtime: no `import React` needed
      "react/prop-types": "off", // plain JS, no PropTypes anywhere in this codebase; not adopting it just for lint
      // Only the long-standing hook-correctness rules - eslint-plugin-react-hooks
      // v7's "recommended" bundles React *Compiler* readiness rules (purity,
      // immutability, gating, ...) that don't apply; this app doesn't use the compiler.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
