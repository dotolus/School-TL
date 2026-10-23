// Registered in scheduler.js for the `npm start` / always-on deployment
// mode, where node-cron actually runs (see server/index.js). On Vercel's
// serverless deployment, GET /api/backup/run (hit by Vercel Cron Jobs
// instead) calls the same runScheduledBackupIfDue() - see CLAUDE.md's
// Backups section for why both paths exist.
const backupStore = require("../services/backupStore");

async function run() {
  try {
    const backup = await backupStore.runScheduledBackupIfDue();
    if (backup) console.log(`[backupJob] Created backup ${backup.id}`);
  } catch (err) {
    console.error("[backupJob] Scheduled backup failed:", err.message);
  }
}

module.exports = { run };
