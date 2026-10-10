const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { PORT, SESSION_SECRET, CLIENT_DIST } = require("./config");
const timelineRoutes = require("./routes/timeline.routes");
const themesRoutes = require("./routes/themes.routes");
const authRoutes = require("./routes/auth.routes");
const scheduler = require("./jobs/scheduler");

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

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  scheduler.start();
});
