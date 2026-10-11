// Shared helper for integration tests: spins up a fresh app instance
// pointed at an isolated temp DATA_DIR, so tests never touch the real
// seed data in server/data/.
//
// vi.resetModules() does not reliably bust Node's native CJS require()
// cache (this codebase is CommonJS throughout), so config.js and anything
// that destructures values from it at require-time (timelineStore.js,
// historyStore.js, themeStore.js, the route files, app.js) would keep
// serving a stale DATA_DIR from a previous test otherwise. Clear every
// server/ module from require.cache by hand instead.
const fs = require("fs");
const os = require("os");
const path = require("path");

const SERVER_DIR = path.join(__dirname, "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) {
      delete require.cache[filename];
    }
  }
}

function createTestApp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-ppt-app-"));
  process.env.DATA_DIR = tmpDir;
  process.env.ADMIN_PASSWORD = "test-password";
  clearServerModuleCache();
  const app = require("../app");
  return { app, tmpDir };
}

function cleanupTestApp(tmpDir) {
  delete process.env.DATA_DIR;
  delete process.env.ADMIN_PASSWORD;
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

module.exports = { createTestApp, cleanupTestApp, clearServerModuleCache };
