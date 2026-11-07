const express = require("express");
const fs = require("fs");
const { CLIENT_DIST } = require("./config");
const timelineRoutes = require("./routes/timeline.routes");
const themesRoutes = require("./routes/themes.routes");
const authRoutes = require("./routes/auth.routes");
const historyRoutes = require("./routes/history.routes");
const eventsRoutes = require("./routes/events.routes");
const backupRoutes = require("./routes/backup.routes");
const backupCronRoutes = require("./routes/backupCron.routes");
const shortLinkRoutes = require("./routes/shortLink.routes");
const { attachDatasetTag } = require("./middleware/datasetTag");
const { renderIndexHtml } = require("./services/htmlTemplate");

const app = express();
app.set("trust proxy", true);

app.use(express.json());

app.use("/api/themes", themesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/backup", backupCronRoutes);

app.use("/api/:school/:period/:class/timeline", attachDatasetTag, timelineRoutes);
app.use("/api/:school/:period/:class/history", attachDatasetTag, historyRoutes);
app.use("/api/:school/:period/:class/events", attachDatasetTag, eventsRoutes);
app.use("/api/:school/:period/:class/backup", attachDatasetTag, backupRoutes);

app.use(shortLinkRoutes);

if (fs.existsSync(CLIENT_DIST)) {
  // index: false - otherwise serve-static auto-serves index.html verbatim
  // for any directory-style request (notably the bare "/"), bypassing
  // renderIndexHtml()'s per-request substitution entirely.
  app.use(express.static(CLIENT_DIST, { index: false }));
  app.get("*", (req, res) => {
    res.set("Content-Type", "text/html");
    res.send(renderIndexHtml(req));
  });
}

// Safety net for async route handlers (see server/utils/asyncHandler.js) -
// anything that reaches here is an unexpected failure, not a validation error.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[app] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: err.message });
});

module.exports = app;
