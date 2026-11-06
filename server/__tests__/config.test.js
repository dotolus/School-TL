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

  it("refuses to load when SESSION_SECRET is unset in production", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "";
    clearServerModuleCache();
    expect(() => require("../config")).toThrow(/SESSION_SECRET/);
  });

  it("loads fine in production once SESSION_SECRET is set", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "a-real-secret";
    clearServerModuleCache();
    expect(() => require("../config")).not.toThrow();
  });

  it("does not require SESSION_SECRET outside production", () => {
    delete process.env.NODE_ENV;
    process.env.SESSION_SECRET = "";
    clearServerModuleCache();
    expect(() => require("../config")).not.toThrow();
  });
});
