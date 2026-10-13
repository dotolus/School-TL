// History entries now live embedded in their owning event document
// (server/services/timelineStore.js appends them there) rather than in a
// standalone log file. This module is read-only: it queries across those
// embedded arrays instead of storing anything itself.
const { getDb } = require("./db");
const { ACTIVE_SCHOOL, ACTIVE_CLASS, ACTIVE_PERIOD } = require("../config");

function activeDatasetFilter() {
  return { school: ACTIVE_SCHOOL, class: ACTIVE_CLASS, period: ACTIVE_PERIOD };
}

async function events() {
  const db = await getDb();
  return db.collection("events");
}

async function list({ itemId, limit } = {}) {
  const col = await events();
  const match = { ...activeDatasetFilter() };
  if (itemId) match._id = itemId;

  const pipeline = [
    { $match: match },
    { $unwind: "$history" },
    { $replaceRoot: { newRoot: "$history" } },
    { $sort: { ts: -1 } },
  ];
  if (limit) pipeline.push({ $limit: Number(limit) });

  return col.aggregate(pipeline).toArray();
}

async function get(eventId) {
  const col = await events();
  const doc = await col.findOne(
    { ...activeDatasetFilter(), "history.id": eventId },
    { projection: { history: 1 } }
  );
  if (!doc) return null;
  return doc.history.find((h) => h.id === eventId) || null;
}

module.exports = { list, get };
