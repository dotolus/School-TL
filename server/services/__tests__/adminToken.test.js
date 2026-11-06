const { sign, verify } = require("../adminToken");

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
});
