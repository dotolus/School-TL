const express = require("express");
const store = require("../services/timelineStore");
const { toPublicEvent } = require("../services/eventsApi");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Public, stable contract for external consumers - no auth required.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await store.getAll(req.datasetTag);
    res.json({ events: items.map(toPublicEvent) });
  })
);

module.exports = router;
