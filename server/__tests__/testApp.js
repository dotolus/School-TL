// Shared helper for integration tests: spins up a fresh app instance
// pointed at an isolated temp DATA_DIR (still used by themeStore) and an
// isolated dataset (a randomized ACTIVE_SCHOOL) on the one Firestore
// emulator shared by the whole `vitest run` (see
// firestoreEmulatorGlobalSetup.js), so tests never touch real seed data or
// each other.
//
// vi.resetModules() does not reliably bust Node's native CJS require()
// cache (this codebase is CommonJS throughout), so config.js and anything
// that destructures values from it at require-time (timelineStore.js,
// historyStore.js, themeStore.js, the persistence layer, the route files,
// app.js) would keep serving stale config from a previous test otherwise.
// Clear every server/ module from require.cache by hand instead.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { applyEmulatorEnv } = require("./firestoreTestEnv");

const SERVER_DIR = path.join(__dirname, "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) {
      delete require.cache[filename];
    }
  }
}

async function createTestApp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-ppt-app-"));
  applyEmulatorEnv();
  process.env.DATA_DIR = tmpDir;
  process.env.ADMIN_PASSWORD = "test-password";
  process.env.ACTIVE_SCHOOL = `test-${crypto.randomUUID()}`;
  process.env.CRON_SECRET = "test-cron-secret";
  // dotenv (loaded by config.js) never overwrites an already-set env var, so
  // blanking these out here - rather than leaving them unset - keeps a real
  // .env's Cloudinary credentials from leaking into tests and hitting the
  // network; imageStore.js falls back to data URIs when these are empty.
  process.env.CLOUDINARY_CLOUD_NAME = "";
  process.env.CLOUDINARY_API_KEY = "";
  process.env.CLOUDINARY_API_SECRET = "";
  clearServerModuleCache();
  const app = require("../app");
  return { app, tmpDir };
}

function cleanupTestApp(tmpDir) {
  delete process.env.DATA_DIR;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ACTIVE_SCHOOL;
  delete process.env.CRON_SECRET;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

module.exports = { createTestApp, cleanupTestApp, clearServerModuleCache };
