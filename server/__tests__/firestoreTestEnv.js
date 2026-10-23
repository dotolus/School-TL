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

module.exports = { applyEmulatorEnv };
