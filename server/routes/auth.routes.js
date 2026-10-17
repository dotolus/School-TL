const express = require("express");
const { ADMIN_PASSWORD } = require("../config");

const router = express.Router();

router.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    console.warn("[auth] Failed login attempt: wrong password");
    return res.status(401).json({ error: "Wrong password" });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

module.exports = router;
