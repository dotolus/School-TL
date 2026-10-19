const fs = require("fs");
const os = require("os");
const path = require("path");
const { defineConfig } = require("@playwright/test");

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eq-ppt-e2e-"));
process.env.EQ_PPT_E2E_DATA_DIR = DATA_DIR; // read by globalTeardown to clean up
const PORT = 4567;

// A real deployment always starts with the committed seed data (themes.json
// has no "create" API - only switching between existing themes - so an
// e2e run against a truly empty DATA_DIR could never show a theme to
// switch to). Mirror that real starting state instead of an artificial
// blank slate. Events now live in Firestore instead of DATA_DIR - see
// e2e/start-server.js, which seeds a self-contained Firestore emulator
// from timeline.json.
const SEED_DIR = path.join(__dirname, "server", "data");
fs.copyFileSync(path.join(SEED_DIR, "themes.json"), path.join(DATA_DIR, "themes.json"));

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalTeardown: require.resolve("./e2e/global-teardown.js"),
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: "node e2e/start-server.js",
    port: PORT,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: String(PORT),
      DATA_DIR,
      ADMIN_PASSWORD: "e2e-test-password",
      SESSION_SECRET: "e2e-test-secret",
      // Force the self-contained Firestore emulator (e2e/start-server.js)
      // and imageStore.js's data-URI fallback, even if the shell running
      // this happens to have real credentials exported.
      FIREBASE_SERVICE_ACCOUNT_JSON: "",
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
    },
  },
});
