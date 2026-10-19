// Vitest globalSetup: starts ONE real Firestore emulator for the whole
// `vitest run`, replacing the old per-test-file mongodb-memory-server
// instances. Per-test isolation is achieved differently here - see
// firestoreTestEnv.js and server/__tests__/testApp.js - by randomizing
// ACTIVE_SCHOOL per test rather than spinning up a fresh database per test,
// since firebase-admin's app registry is a process-wide singleton (unlike a
// disposable MongoClient) and every read/write is already partitioned by
// school/class/period anyway.
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { STATE_FILE } = require("./firestoreEmulatorState");

const PROJECT_ID = "demo-eq-ppt-test";
const HOST = "127.0.0.1:8080";
const REPO_ROOT = path.join(__dirname, "..", "..");
const READY_PATTERN = /All emulators ready|Firestore Emulator UI|is now safe to connect/i;

module.exports = async function globalSetup() {
  const child = spawn(
    "npx",
    ["firebase-tools", "emulators:start", "--only", "firestore", "--project", PROJECT_ID],
    { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" }
  );

  await new Promise((resolve, reject) => {
    let ready = false;
    const onData = (chunk) => {
      const text = chunk.toString();
      if (!ready && READY_PATTERN.test(text)) {
        ready = true;
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", reject);
    child.once("exit", (code) => {
      if (!ready) reject(new Error(`firebase-tools emulator exited early (code ${code})`));
    });
    const timer = setTimeout(() => {
      if (!ready) reject(new Error("Timed out waiting for the Firestore emulator to start"));
    }, 60_000);
    timer.unref();
  });

  fs.writeFileSync(STATE_FILE, JSON.stringify({ host: HOST, projectId: PROJECT_ID }));

  return async function globalTeardown() {
    killEmulatorTree(child);
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  };
};

// child was spawned with shell:true (required for npx.cmd on Windows), so
// child.kill() only kills the shell, leaving the actual Java emulator
// process (and the node process npx forks) running and the port held.
function killEmulatorTree(child) {
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`);
    } catch {
      // already exited
    }
  } else {
    child.kill();
  }
}
