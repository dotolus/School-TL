// One-off migration: loads the committed demo data in server/data/timeline.json
// into MongoDB, tagged with the active school/class/period from config/env
// (defaults to reut/e4/2026-2027). Run manually - this is not part of app boot.
//
//   node scripts/migrate-to-mongo.js
//
// Safe to re-run: items are upserted by their existing id, so running it
// twice won't create duplicates.
const fs = require("fs");
const path = require("path");
const { getDb } = require("../server/services/db");
const { ACTIVE_SCHOOL, ACTIVE_CLASS, ACTIVE_PERIOD } = require("../server/config");

async function main() {
  const seedPath = path.join(__dirname, "..", "server", "data", "timeline.json");
  const { items } = JSON.parse(fs.readFileSync(seedPath, "utf8"));

  const db = await getDb();
  const col = db.collection("events");
  const now = new Date().toISOString();

  let count = 0;
  for (const item of items) {
    const doc = {
      _id: item.id,
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
    };
    await col.updateOne(
      { _id: doc._id },
      { $set: doc, $setOnInsert: { history: [] } },
      { upsert: true }
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
