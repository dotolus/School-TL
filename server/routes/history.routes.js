const express = require("express");
const historyStore = require("../services/historyStore");
const timelineStore = require("../services/timelineStore");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const { itemId, limit } = req.query;
  const events = historyStore.list({ itemId, limit: limit ? Number(limit) : undefined });
  res.json({ events });
});

router.post("/:eventId/restore", requireAuth, (req, res) => {
  const restored = timelineStore.restoreFromHistory(req.params.eventId);
  if (!restored) return res.status(404).json({ error: "Nothing to restore for that event" });
  res.json(restored);
});

module.exports = router;
