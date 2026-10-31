const express = require("express");
const backupStore = require("../services/backupStore");
const { requireCronSecret } = require("../middleware/cronAuth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Vercel Cron Jobs only issue GET requests, hence GET here (not POST) -
// see vercel.json's `crons` and server/middleware/cronAuth.js.
// server/jobs/backupJob.js hits the same underlying runScheduledBackupIfDue()
// directly (not via HTTP) for the `npm start` / node-cron deployment mode.
// Mounted flat (not under /:school/:period/:class) since it has no URL to
// derive a dataset from - runScheduledBackupIfDue() builds its own tag from
// the env-var-configured default dataset.
router.get(
  "/run",
  requireCronSecret,
  asyncHandler(async (req, res) => {
    const backup = await backupStore.runScheduledBackupIfDue();
    res.json({ created: Boolean(backup), backup });
  })
);

module.exports = router;
