const express = require("express");
const backupStore = require("../services/backupStore");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const backups = await backupStore.listBackups(req.datasetTag);
    res.json({ backups });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const backup = await backupStore.createBackup(req.datasetTag);
    res.status(201).json(backup);
  })
);

router.post(
  "/:id/restore",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await backupStore.restoreBackup(req.datasetTag, req.params.id);
    if (!result) return res.status(404).json({ error: "Backup not found" });
    res.json(result);
  })
);

module.exports = router;
