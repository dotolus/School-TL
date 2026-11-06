const crypto = require("crypto");
const { SESSION_SECRET } = require("../config");

// Stateless admin-session token: a signed cookie value instead of a
// server-memory session. This is what lets admin auth survive a serverless
// function instance being recycled between requests (see server/app.js) -
// there's no in-process store to lose, since the request itself carries
// everything needed to verify it.

// SESSION_SECRET's fallback (server/config.js) is public source, so a
// production deployment that never set a real one would let anyone forge
// an admin cookie. This check lives here - called lazily, only when a
// token is actually signed or verified - rather than at config.js's
// module-load time: config.js is required by every request, including
// fully public ones, and must never be the reason the whole app goes
// down over a setting only admin auth depends on.
function assertSecretConfigured() {
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production - it signs the admin-session cookie and the fallback default is public."
    );
  }
}

function hmac(body) {
  assertSecretConfigured();
  return crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
}

function sign(payload, maxAgeMs) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + maxAgeMs })).toString("base64url");
  return `${body}.${hmac(body)}`;
}

function verify(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = hmac(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
  return payload;
}

module.exports = { sign, verify };
