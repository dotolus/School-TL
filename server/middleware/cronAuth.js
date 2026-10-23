const { CRON_SECRET } = require("../config");

// Gates GET /api/backup/run - the endpoint Vercel Cron Jobs hit on a
// serverless deployment (see vercel.json's `crons`), where node-cron's own
// scheduler (server/jobs/scheduler.js) never runs because that only starts
// from server/index.js's long-running process, not the headless server/app.js
// Vercel's api/index.js requires. Vercel automatically attaches
// `Authorization: Bearer <CRON_SECRET>` to its own requests to this path
// once CRON_SECRET is set as a project env var - this is the only thing
// standing between that route and the public internet otherwise.
function requireCronSecret(req, res, next) {
  if (!CRON_SECRET) {
    console.warn("[cronAuth] CRON_SECRET is not set - rejecting scheduled backup request");
    return res.status(503).json({ error: "CRON_SECRET is not configured" });
  }
  if (req.headers.authorization === `Bearer ${CRON_SECRET}`) {
    return next();
  }
  console.warn("[cronAuth] Unauthorized scheduled request");
  return res.status(401).json({ error: "Unauthorized" });
}

module.exports = { requireCronSecret };
