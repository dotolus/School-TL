const crypto = require("crypto");
const { SESSION_SECRET } = require("../config");

// Stateless admin-session token: a signed cookie value instead of a
// server-memory session. This is what lets admin auth survive a serverless
// function instance being recycled between requests (see server/app.js) -
// there's no in-process store to lose, since the request itself carries
// everything needed to verify it.

function hmac(body) {
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
