function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  // Reject before the body (e.g. a multipart upload) is read: drain it so
  // the client's write completes cleanly instead of the connection
  // aborting mid-upload.
  req.resume();
  console.warn(`[auth] Unauthorized request: ${req.method} ${req.originalUrl}`);
  return res.status(401).json({ error: "Authentication required" });
}

module.exports = { requireAuth };
