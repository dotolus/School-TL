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

  it("exposes the default-class map used to resolve a class-less short link", () => {
    const config = require("../config");
    expect(config.DEFAULT_CLASS_BY_SCHOOL).toEqual({ reut: "e4" });
  });

  it("lets CLIENT_DIST be overridden by an env var (for test isolation)", () => {
    process.env.CLIENT_DIST = "/tmp/fake-dist";
    clearServerModuleCache();
    const config = require("../config");
    expect(config.CLIENT_DIST).toBe("/tmp/fake-dist");
    delete process.env.CLIENT_DIST;
  });
});
