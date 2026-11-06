const path = require("path");

const SERVER_DIR = path.join(__dirname, "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) delete require.cache[filename];
  }
}

describe("config", () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SESSION_SECRET;
    clearServerModuleCache();
  });

  // Regression test for a production incident: config.js is required by
  // every request (including fully public ones, via app.js's top-level
  // route requires), so it must never be the thing that takes the whole
  // app down. A missing SESSION_SECRET only matters to admin auth - see
  // server/services/adminToken.js, which is where that check now lives,
  // and only runs when admin auth is actually exercised.
  it("never throws just from loading config, even in production without SESSION_SECRET", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "";
    clearServerModuleCache();
    expect(() => require("../config")).not.toThrow();
  });
});
