const express = require("express");
const historyStore = require("../services/historyStore");
const timelineStore = require("../services/timelineStore");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { itemId, limit } = req.query;
    const events = await historyStore.list({ itemId, limit: limit ? Number(limit) : undefined });
    res.json({ events });
  })
);

router.post(
  "/:eventId/restore",
  requireAuth,
  asyncHandler(async (req, res) => {
    const restored = await timelineStore.restoreFromHistory(req.params.eventId);
    if (!restored) return res.status(404).json({ error: "Nothing to restore for that event" });
    res.json(restored);
  })
);

module.exports = router;
