// webServer entrypoint for Playwright: boots a self-contained in-memory
// MongoDB and seeds it from the committed demo data (server/data/timeline.json),
// matching the "a real deployment always starts from committed seed data"
// rationale in playwright.config.js - just via Mongo now instead of copying
// the JSON file into DATA_DIR. Cloudinary is deliberately left unconfigured
// here so image-upload specs exercise imageStore.js's data-URI fallback
// instead of needing real credentials in CI.
const fs = require("fs");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB_NAME = "eq_ppt_e2e";

  const school = process.env.ACTIVE_SCHOOL || "reut";
  const klass = process.env.ACTIVE_CLASS || "e4";
  const period = process.env.ACTIVE_PERIOD || "2026-2027";

  const seedPath = path.join(__dirname, "..", "server", "data", "timeline.json");
  const { items } = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const now = new Date().toISOString();

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  if (items.length) {
    await db.collection("events").insertMany(
      items.map((item) => ({
        _id: item.id,
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
        history: [],
        createdAt: now,
        updatedAt: now,
      }))
    );
  }
  await client.close();

  async function shutdown() {
    await mongod.stop();
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
