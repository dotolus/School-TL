// Shared helper for integration tests: spins up a fresh app instance
// pointed at an isolated temp DATA_DIR (still used by themeStore) and an
// isolated Mongo database name on a shared in-memory mongod (one per test
// file, started lazily) so tests never touch real seed data or each other.
//
// vi.resetModules() does not reliably bust Node's native CJS require()
// cache (this codebase is CommonJS throughout), so config.js and anything
// that destructures values from it at require-time (timelineStore.js,
// historyStore.js, themeStore.js, db.js, the route files, app.js) would
// keep serving stale config from a previous test otherwise. Clear every
// server/ module from require.cache by hand instead.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const SERVER_DIR = path.join(__dirname, "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) {
      delete require.cache[filename];
    }
  }
}

let mongodPromise = null;
function getMongod() {
  if (!mongodPromise) {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongodPromise = MongoMemoryServer.create();
  }
  return mongodPromise;
}

// One mongod per test file (module graph), torn down once that file's tests finish.
afterAll(async () => {
  if (!mongodPromise) return;
  const mongod = await mongodPromise;
  await mongod.stop();
});

async function createTestApp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-ppt-app-"));
  const mongod = await getMongod();
  process.env.DATA_DIR = tmpDir;
  process.env.ADMIN_PASSWORD = "test-password";
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB_NAME = `eq_ppt_test_${crypto.randomUUID()}`;
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
  delete process.env.MONGODB_URI;
  delete process.env.MONGODB_DB_NAME;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

module.exports = { createTestApp, cleanupTestApp, clearServerModuleCache };
