const express = require("express");
const { ADMIN_PASSWORD } = require("../config");
const { getAdminSession, issueAdminCookie, ADMIN_COOKIE_NAME } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    console.warn("[auth] Failed login attempt: wrong password");
    return res.status(401).json({ error: "Wrong password" });
  }
  issueAdminCookie(res);
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  res.json({ isAdmin: !!getAdminSession(req) });
});

module.exports = router;
