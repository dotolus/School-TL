// Reads the running Firestore emulator's connection info (written once by
// firestoreEmulatorGlobalSetup.js) and applies it to this worker's env.
// firebase-admin reads FIRESTORE_EMULATOR_HOST natively - no custom
// plumbing needed beyond setting it.
const fs = require("fs");
const { STATE_FILE } = require("./firestoreEmulatorState");

function applyEmulatorEnv() {
  const { host, projectId } = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  process.env.FIRESTORE_EMULATOR_HOST = host;
  process.env.FIREBASE_PROJECT_ID = projectId;
}

// A `.where()` query against the Firestore emulator can briefly lag behind
// a just-written doc when the whole `vitest run`'s ~20 parallel workers are
// all hammering the one shared emulator at once (a point read by id doesn't
// show this - see getBackup/getEvent/getHistoryEntry) - harmless in real
// usage (nothing here polls at human timescales), but it make a test that
// lists right after writing occasionally flake under full-suite load. Tests
// doing that should poll through this instead of asserting once.
async function waitFor(fn, { timeout = 3000, interval = 100 } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await fn();
    if (last) return last;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return last;
}

module.exports = { applyEmulatorEnv, waitFor };
