const path = require("path");
require("dotenv").config();

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");

// The entire downloaded Firebase service-account JSON, pasted as one env var
// value. JSON.parse handles the private_key's embedded \n escapes correctly
// on its own - no separate newline-unescaping needed, which is the usual
// gotcha when a private key is passed as its own standalone env var instead.
let FIREBASE_SERVICE_ACCOUNT = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    FIREBASE_SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (err) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${err.message}`);
  }
}

module.exports = {
  PORT: Number(process.env.PORT) || 4000,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme",
  SESSION_SECRET: process.env.SESSION_SECRET || "eq-ppt-dev-secret",
  DATA_DIR,
  THEMES_FILE: path.join(DATA_DIR, "themes.json"),
  CLIENT_DIST: path.join(__dirname, "..", "client", "dist"),
  SCHEDULER_CRON: process.env.SCHEDULER_CRON || "0 6 * * *",

  // Events live in a pluggable persistence layer (server/services/persistence/)
  // rather than a JSON file, so the data survives deploys/redeploys. Each
  // event is tagged with the school/class/period it belongs to (see
  // server/services/timelineStore.js) so multiple datasets can coexist in
  // the same backend; ACTIVE_* picks which one this server instance
  // reads/writes. Switching datasets today means changing these three env
  // vars - there's no runtime admin UI for it yet.
  DB_PROVIDER: process.env.DB_PROVIDER || "firestore",
  FIREBASE_SERVICE_ACCOUNT,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || FIREBASE_SERVICE_ACCOUNT?.project_id,
  ACTIVE_SCHOOL: process.env.ACTIVE_SCHOOL || "reut",
  ACTIVE_CLASS: process.env.ACTIVE_CLASS || "e4",
  ACTIVE_PERIOD: process.env.ACTIVE_PERIOD || "2026-2027",

  // Event images are uploaded to Cloudinary instead of local disk, for the
  // same reason - local disk doesn't survive a redeploy. If these are unset
  // (e.g. a contributor hasn't set up a Cloudinary account, or CI), file
  // uploads fall back to inline data URIs instead of failing outright - see
  // server/services/fileStore.js.
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Full-dataset backups (see server/services/backupStore.js). Cron syntax
  // has no native "every N weeks" - BACKUP_CRON just controls how often the
  // backup is *checked for*, while BACKUP_MIN_INTERVAL_DAYS is what actually
  // enforces the real cadence, by comparing against the last backup's
  // timestamp. Defaults: check every Sunday, back up at most once every 14
  // days.
  BACKUP_CRON: process.env.BACKUP_CRON || "0 6 * * 0",
  BACKUP_MIN_INTERVAL_DAYS: Number(process.env.BACKUP_MIN_INTERVAL_DAYS) || 14,
  // Shared secret for GET /api/backup/run (server/routes/backup.routes.js),
  // the endpoint Vercel Cron Jobs hit on a serverless deployment where
  // node-cron's own scheduler (server/jobs/scheduler.js) never runs - see
  // CLAUDE.md's Backups section. Vercel automatically sends
  // `Authorization: Bearer <CRON_SECRET>` to cron-configured routes when
  // this is set as a project env var.
  CRON_SECRET: process.env.CRON_SECRET || null,
};
