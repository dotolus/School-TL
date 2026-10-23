// Writes an export produced by scripts/export-from-atlas.js into the real
// Firestore project (requires FIREBASE_SERVICE_ACCOUNT_JSON - see
// .env.example). Writes both the events and history collections, keeping
// each history entry's original id so it stays individually restorable
// exactly as it was under Mongo. Idempotent: re-running overwrites by id,
// it does not duplicate.
//
//   node scripts/import-to-firestore.js firestore-import.json
const fs = require("fs");
const path = require("path");
const { getDb } = require("../server/services/persistence/firestoreAdapter");

const BATCH_SIZE = 400; // Firestore write batches cap at 500 operations

async function main() {
  const inputPath = path.resolve(process.argv[2] || "firestore-import.json");
  const { events, history } = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  const db = getDb();
  const writes = [
    ...events.map(({ id, ...fields }) => ({ ref: db.collection("events").doc(id), fields })),
    ...history.map(({ id, ...fields }) => ({ ref: db.collection("history").doc(id), fields })),
  ];

  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { ref, fields } of writes.slice(i, i + BATCH_SIZE)) {
      batch.set(ref, fields, { merge: true });
    }
    await batch.commit();
  }

  console.log(`Imported ${events.length} event(s) and ${history.length} history entry(ies) into Firestore.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
