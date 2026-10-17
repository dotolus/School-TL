const { MongoClient } = require("mongodb");
const { MONGODB_URI, MONGODB_DB_NAME } = require("../config");

let dbPromise = null;

function connect() {
  if (!MONGODB_URI) {
    const err = new Error("MONGODB_URI is not set - see .env.example");
    console.error("[db] MongoDB connection failed:", err.message);
    throw err;
  }
  const client = new MongoClient(MONGODB_URI);
  return client
    .connect()
    .then(async (connected) => {
      const db = connected.db(MONGODB_DB_NAME);
      await db
        .collection("events")
        .createIndex({ school: 1, class: 1, period: 1, status: 1 });
      console.log(`[db] Connected to MongoDB database "${MONGODB_DB_NAME}"`);
      return db;
    })
    .catch((err) => {
      console.error("[db] MongoDB connection failed:", err.message);
      // Let the next call retry instead of permanently reusing a rejected
      // promise - a transient outage shouldn't wedge the app until restart.
      dbPromise = null;
      throw err;
    });
}

function getDb() {
  if (!dbPromise) dbPromise = connect();
  return dbPromise;
}

module.exports = { getDb };
