const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { SESSION_SECRET, CLIENT_DIST } = require("./config");
const timelineRoutes = require("./routes/timeline.routes");
const themesRoutes = require("./routes/themes.routes");
const authRoutes = require("./routes/auth.routes");
const historyRoutes = require("./routes/history.routes");
const eventsRoutes = require("./routes/events.routes");
const backupRoutes = require("./routes/backup.routes");

const app = express();

app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

app.use("/api/timeline", timelineRoutes);
app.use("/api/themes", themesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/backup", backupRoutes);

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
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
