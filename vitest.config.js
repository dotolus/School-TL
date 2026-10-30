const path = require("path");
const { defineConfig } = require("vitest/config");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(require("./package.json").version),
  },
  resolve: {
    // Component source files under client/src live next to client/node_modules,
    // which Node's resolution algorithm would otherwise prefer over the root
    // copy that @testing-library/react resolves against - two React copies at
    // once breaks hooks ("Invalid hook call"). Force everything to the one
    // at the repo root. react-router-dom needs the same treatment: resolved
    // from client/node_modules, its own internal `require("react")` would
    // otherwise land on client's react instead of this same root one.
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-router-dom": path.resolve(__dirname, "node_modules/react-router-dom"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    globalSetup: ["./server/__tests__/firestoreEmulatorGlobalSetup.js"],
    include: [
      "server/**/__tests__/**/*.test.js",
      "client/src/**/__tests__/**/*.test.{js,jsx}",
      "scripts/**/__tests__/**/*.test.js",
    ],
    exclude: ["node_modules", "client/node_modules", "e2e"],
  },
});
