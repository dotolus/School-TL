const { MongoClient } = require("mongodb");
const { MONGODB_URI, MONGODB_DB_NAME } = require("../config");

let dbPromise = null;

function connect() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set - see .env.example");
  }
  const client = new MongoClient(MONGODB_URI);
  return client.connect().then(async (connected) => {
    const db = connected.db(MONGODB_DB_NAME);
    await db
      .collection("events")
      .createIndex({ school: 1, class: 1, period: 1, status: 1 });
    return db;
  });
}

function getDb() {
  if (!dbPromise) dbPromise = connect();
  return dbPromise;
}

module.exports = { getDb };
