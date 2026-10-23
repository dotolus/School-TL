const cron = require("node-cron");
const { SCHEDULER_CRON, BACKUP_CRON } = require("../config");
const exampleJob = require("./exampleJob");
const backupJob = require("./backupJob");

// Add further jobs to this list as real periodic business flows are built.
const JOBS = [
  { name: "exampleJob", schedule: SCHEDULER_CRON, task: exampleJob.run },
  { name: "backupJob", schedule: BACKUP_CRON, task: backupJob.run },
];

function start() {
  JOBS.forEach(({ name, schedule, task }) => {
    cron.schedule(schedule, task);
    console.log(`[scheduler] registered "${name}" on schedule "${schedule}"`);
  });
}

module.exports = { start };
