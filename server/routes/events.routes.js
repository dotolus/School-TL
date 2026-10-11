const express = require("express");
const store = require("../services/timelineStore");
const { toPublicEvent } = require("../services/eventsApi");

const router = express.Router();

// Public, stable contract for external consumers - no auth required.
router.get("/", (req, res) => {
  res.json({ events: store.getAll().map(toPublicEvent) });
});

module.exports = router;
