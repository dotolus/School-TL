// Shared path so firestoreEmulatorGlobalSetup.js (writer) and
// firestoreTestEnv.js (reader, used from any test worker) agree on where
// the running emulator's connection info lives.
const os = require("os");
const path = require("path");

const STATE_FILE = path.join(os.tmpdir(), "eq-ppt-firestore-emulator-state.json");

module.exports = { STATE_FILE };
