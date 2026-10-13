const path = require("path");
require("dotenv").config();

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");

module.exports = {
  PORT: Number(process.env.PORT) || 4000,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme",
  SESSION_SECRET: process.env.SESSION_SECRET || "eq-ppt-dev-secret",
  DATA_DIR,
  THEMES_FILE: path.join(DATA_DIR, "themes.json"),
  CLIENT_DIST: path.join(__dirname, "..", "client", "dist"),
  SCHEDULER_CRON: process.env.SCHEDULER_CRON || "0 6 * * *",

  // Events now live in MongoDB rather than a JSON file, so the data survives
  // deploys/redeploys. Each event is tagged with the school/class/period it
  // belongs to (see server/services/timelineStore.js) so multiple datasets
  // can coexist in the same collection; ACTIVE_* picks which one this
  // server instance reads/writes. Switching datasets today means changing
  // these three env vars - there's no runtime admin UI for it yet.
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "eq_ppt",
  ACTIVE_SCHOOL: process.env.ACTIVE_SCHOOL || "reut",
  ACTIVE_CLASS: process.env.ACTIVE_CLASS || "e4",
  ACTIVE_PERIOD: process.env.ACTIVE_PERIOD || "2026-2027",

  // Event images are uploaded to Cloudinary instead of local disk, for the
  // same reason - local disk doesn't survive a redeploy. If these are unset
  // (e.g. a contributor hasn't set up a Cloudinary account, or CI), image
  // uploads fall back to inline data URIs instead of failing outright - see
  // server/services/imageStore.js.
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};
