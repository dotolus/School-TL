const app = require("./app");
const { PORT } = require("./config");
const scheduler = require("./jobs/scheduler");

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  scheduler.start();
});
