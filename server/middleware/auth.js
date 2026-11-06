const { sign, verify } = require("../services/adminToken");
const { ADMIN_SESSION_MAX_AGE_MS } = require("../config");

const ADMIN_COOKIE_NAME = "admin_token";

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key) cookies[key] = decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return cookies;
}

// A signed, stateless cookie instead of a server-memory session - see
// server/services/adminToken.js for why. Used both to check the current
// request's auth state (getAdminSession) and to (re-)issue the cookie
// (issueAdminCookie), which requireAuth calls on every authenticated
// request so an admin who keeps interacting stays logged in past
// ADMIN_SESSION_MAX_AGE_MS (a sliding window, not a fixed login duration).

function getAdminSession(req) {
  return verify(parseCookies(req.headers.cookie)[ADMIN_COOKIE_NAME]);
}

function issueAdminCookie(res) {
  res.cookie(ADMIN_COOKIE_NAME, sign({ isAdmin: true }, ADMIN_SESSION_MAX_AGE_MS), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE_MS,
  });
}

function requireAuth(req, res, next) {
  if (getAdminSession(req)) {
    issueAdminCookie(res);
    return next();
  }
  // Reject before the body (e.g. a multipart upload) is read: drain it so
  // the client's write completes cleanly instead of the connection
  // aborting mid-upload.
  req.resume();
  console.warn(`[auth] Unauthorized request: ${req.method} ${req.originalUrl}`);
  return res.status(401).json({ error: "Authentication required" });
}

module.exports = { requireAuth, getAdminSession, issueAdminCookie, ADMIN_COOKIE_NAME };
