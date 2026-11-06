const path = require("path");
const { sign, verify } = require("../adminToken");

const SERVER_DIR = path.join(__dirname, "..", "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) delete require.cache[filename];
  }
}

describe("adminToken", () => {
  it("verifies a token it just signed", () => {
    const token = sign({ isAdmin: true }, 1000);
    expect(verify(token)).toEqual(expect.objectContaining({ isAdmin: true }));
  });

  it("rejects a token whose expiry has already passed", () => {
    const token = sign({ isAdmin: true }, -1);
    expect(verify(token)).toBeNull();
  });

  it("rejects a token with a tampered payload", () => {
    const token = sign({ isAdmin: true }, 1000);
    const [, sig] = token.split(".");
    const tamperedBody = Buffer.from(JSON.stringify({ isAdmin: true, exp: Date.now() + 999999 })).toString(
      "base64url"
    );
    expect(verify(`${tamperedBody}.${sig}`)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verify("not-a-real-token")).toBeNull();
    expect(verify("")).toBeNull();
    expect(verify(null)).toBeNull();
    expect(verify(undefined)).toBeNull();
  });

  describe("production secret guard", () => {
    // This check used to live in config.js, which is required by every
    // request (even fully public ones) - a misconfigured secret there
    // took down the whole app. It belongs here instead: sign/verify are
    // only ever called from admin-auth code paths, so only those fail
    // closed if SESSION_SECRET is misconfigured in production.
    afterEach(() => {
      delete process.env.NODE_ENV;
      delete process.env.SESSION_SECRET;
      clearServerModuleCache();
    });

    it("throws when signing in production without a real SESSION_SECRET", () => {
      process.env.NODE_ENV = "production";
      process.env.SESSION_SECRET = "";
      clearServerModuleCache();
      const fresh = require("../adminToken");
      expect(() => fresh.sign({ isAdmin: true }, 1000)).toThrow(/SESSION_SECRET/);
    });

    it("throws when verifying in production without a real SESSION_SECRET", () => {
      process.env.NODE_ENV = "production";
      process.env.SESSION_SECRET = "";
      clearServerModuleCache();
      const fresh = require("../adminToken");
      expect(() => fresh.verify("a.b")).toThrow(/SESSION_SECRET/);
    });

    it("does not throw in production once SESSION_SECRET is set", () => {
      process.env.NODE_ENV = "production";
      process.env.SESSION_SECRET = "a-real-secret";
      clearServerModuleCache();
      const fresh = require("../adminToken");
      const token = fresh.sign({ isAdmin: true }, 1000);
      expect(fresh.verify(token)).toEqual(expect.objectContaining({ isAdmin: true }));
    });
  });
});
