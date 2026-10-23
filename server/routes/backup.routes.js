const express = require("express");
const backupStore = require("../services/backupStore");
const { requireAuth } = require("../middleware/auth");
const { requireCronSecret } = require("../middleware/cronAuth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const backups = await backupStore.listBackups();
    res.json({ backups });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const backup = await backupStore.createBackup();
    res.status(201).json(backup);
  })
);

router.post(
  "/:id/restore",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await backupStore.restoreBackup(req.params.id);
    if (!result) return res.status(404).json({ error: "Backup not found" });
    res.json(result);
  })
);

// Vercel Cron Jobs only issue GET requests, hence GET here (not POST) -
// see vercel.json's `crons` and server/middleware/cronAuth.js.
// server/jobs/backupJob.js hits the same underlying runScheduledBackupIfDue()
// directly (not via HTTP) for the `npm start` / node-cron deployment mode.
router.get(
  "/run",
  requireCronSecret,
  asyncHandler(async (req, res) => {
    const backup = await backupStore.runScheduledBackupIfDue();
    res.json({ created: Boolean(backup), backup });
  })
);

module.exports = router;
