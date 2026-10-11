const path = require("path");
require("dotenv").config();

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");

module.exports = {
  PORT: Number(process.env.PORT) || 4000,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme",
  SESSION_SECRET: process.env.SESSION_SECRET || "eq-ppt-dev-secret",
  DATA_DIR,
  TIMELINE_FILE: path.join(DATA_DIR, "timeline.json"),
  THEMES_FILE: path.join(DATA_DIR, "themes.json"),
  HISTORY_FILE: path.join(DATA_DIR, "history.jsonl"),
  CLIENT_DIST: path.join(__dirname, "..", "client", "dist"),
  SCHEDULER_CRON: process.env.SCHEDULER_CRON || "0 6 * * *",
};
