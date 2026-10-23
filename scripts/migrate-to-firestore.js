// One-off: loads the committed demo data in server/data/timeline.json into
// Firestore, tagged with the active school/class/period from config/env
// (defaults to reut/e4/2026-2027). Run manually - this is not part of app
// boot.
//
//   node scripts/migrate-to-firestore.js
//
// Safe to re-run: events are upserted by their existing id (merge:true), so
// running it twice won't duplicate anything or touch any already-
// accumulated history - history lives in its own collection now, so there's
// nothing on the event doc itself to clobber.
const fs = require("fs");
const path = require("path");
const { getDb } = require("../server/services/persistence/firestoreAdapter");
const { ACTIVE_SCHOOL, ACTIVE_CLASS, ACTIVE_PERIOD } = require("../server/config");

async function main() {
  const seedPath = path.join(__dirname, "..", "server", "data", "timeline.json");
  const { items } = JSON.parse(fs.readFileSync(seedPath, "utf8"));

  const db = getDb();
  const now = new Date().toISOString();

  let count = 0;
  for (const item of items) {
    await db
      .collection("events")
      .doc(item.id)
      .set(
        {
          school: ACTIVE_SCHOOL,
          class: ACTIVE_CLASS,
          period: ACTIVE_PERIOD,
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
        },
        { merge: true }
      );
    count += 1;
  }

  console.log(`Migrated ${count} items into ${ACTIVE_SCHOOL}/${ACTIVE_CLASS}/${ACTIVE_PERIOD}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
