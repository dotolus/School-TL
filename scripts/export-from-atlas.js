// One-off, read-only export of the CURRENT production MongoDB Atlas events
// (including their embedded history) for the active school/class/period
// dataset, shaped for scripts/import-to-firestore.js. Makes no writes to
// Atlas. Part of the one-time Mongo -> Firestore cutover - see CLAUDE.md's
// persistence section - not something the running app ever calls.
//
// Needs the real production connection string and, temporarily, the
// `mongodb` package; both can be removed once the cutover is verified and
// this script is no longer needed.
//
//   MONGODB_URI="mongodb+srv://..." node scripts/export-from-atlas.js [outputFile]
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { ACTIVE_SCHOOL, ACTIVE_CLASS, ACTIVE_PERIOD } = require("../server/config");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Set MONGODB_URI to the real production Atlas connection string before running this.");
  }
  const dbName = process.env.MONGODB_DB_NAME || "eq_ppt";
  const outPath = path.resolve(process.argv[2] || "firestore-import.json");

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection("events");
    const docs = await col
      .find({ school: ACTIVE_SCHOOL, class: ACTIVE_CLASS, period: ACTIVE_PERIOD })
      .toArray();

    const events = docs.map((doc) => {
      const rest = { ...doc };
      delete rest._id;
      delete rest.history;
      return { id: doc._id, ...rest };
    });

    const history = docs.flatMap((doc) =>
      (doc.history || []).map((entry) => ({
        ...entry,
        itemId: entry.itemId || doc._id,
        school: doc.school,
        class: doc.class,
        period: doc.period,
      }))
    );

    fs.writeFileSync(outPath, JSON.stringify({ events, history }, null, 2));
    console.log(
      `Exported ${events.length} event(s) and ${history.length} history entry(ies) from ` +
        `${ACTIVE_SCHOOL}/${ACTIVE_CLASS}/${ACTIVE_PERIOD} to ${outPath}.`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
