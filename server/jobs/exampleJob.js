// Placeholder extension point for the future recurring "business flow" that
// changes the timeline data periodically. Currently a no-op — wire real
// logic here later (e.g. read timelineStore, add/expire/update items, then
// let the scheduler re-run it on its cron schedule).
function run() {
  console.log(`[exampleJob] tick at ${new Date().toISOString()} (no-op)`);
}

module.exports = { run };
