// webServer entrypoint for Playwright: boots a self-contained Firestore
// emulator (separate port/project from the one server/__tests__/
// firestoreEmulatorGlobalSetup.js uses for `npm test`, so both can run
// concurrently) and seeds it from the committed demo data
// (server/data/timeline.json), matching the "a real deployment always
// starts from committed seed data" rationale in playwright.config.js.
// Cloudinary is deliberately left unconfigured here so image-upload specs
// exercise imageStore.js's data-URI fallback instead of needing real
// credentials in CI.
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const PROJECT_ID = "demo-eq-ppt-e2e";
const HOST = "127.0.0.1:8085";
const REPO_ROOT = path.join(__dirname, "..");
const READY_PATTERN = /All emulators ready|Firestore Emulator UI|is now safe to connect/i;

function startEmulator() {
  const child = spawn(
    "npx",
    ["firebase-tools", "emulators:start", "--only", "firestore", "--project", PROJECT_ID, "--config", "e2e/firebase.json"],
    { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" }
  );
  return new Promise((resolve, reject) => {
    let ready = false;
    const onData = (chunk) => {
      const text = chunk.toString();
      if (!ready && READY_PATTERN.test(text)) {
        ready = true;
        resolve(child);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", reject);
    child.once("exit", (code) => {
      if (!ready) reject(new Error(`firebase-tools emulator exited early (code ${code})`));
    });
    setTimeout(() => {
      if (!ready) reject(new Error("Timed out waiting for the Firestore emulator to start"));
    }, 60_000);
  });
}

async function main() {
  const emulator = await startEmulator();
  process.env.FIRESTORE_EMULATOR_HOST = HOST;
  process.env.FIREBASE_PROJECT_ID = PROJECT_ID;

  // Use the real adapter module (not a raw firebase-admin call) for seeding,
  // so Firestore's settings() gets applied exactly once by the same code
  // path the rest of the app uses - server/index.js requires this same
  // cached module instance later, with no cache-clearing in play here, so
  // there's no double-init/double-settings risk.
  const { getDb } = require("../server/services/persistence/firestoreAdapter");
  const db = getDb();

  const school = process.env.ACTIVE_SCHOOL || "reut";
  const klass = process.env.ACTIVE_CLASS || "e4";
  const period = process.env.ACTIVE_PERIOD || "2026-2027";

  const seedPath = path.join(REPO_ROOT, "server", "data", "timeline.json");
  const { items } = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const now = new Date().toISOString();

  if (items.length) {
    const batch = db.batch();
    for (const item of items) {
      batch.set(db.collection("events").doc(item.id), {
        school,
        class: klass,
        period,
        status: "active",
        type: item.type,
        m: item.m,
        y: item.y,
        title: item.title,
        short: item.short,
        full: item.full,
        detail: item.detail || {},
        "required-white-shirt": Boolean(item["required-white-shirt"]),
        "required-food": Boolean(item["required-food"]),
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();
  }

  function shutdown() {
    // emulator was spawned with shell:true (required for npx.cmd on
    // Windows), so .kill() alone only kills the shell, leaving the actual
    // Java emulator process running and the port held.
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /pid ${emulator.pid} /T /F`);
      } catch {
        // already exited
      }
    } else {
      emulator.kill();
    }
    process.exit(0);
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  require("../server/index.js");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
