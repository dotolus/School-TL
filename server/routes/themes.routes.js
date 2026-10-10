const express = require("express");
const store = require("../services/themeStore");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(store.getAll());
});

router.put("/active", requireAuth, (req, res) => {
  try {
    const data = store.setActive(req.body.id);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
