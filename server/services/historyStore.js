const fs = require("fs");
const crypto = require("crypto");
const { HISTORY_FILE, DATA_DIR } = require("../config");

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll() {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const raw = fs.readFileSync(HISTORY_FILE, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function append(entry) {
  ensureDataDir();
  const full = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    ...entry,
  };
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(full) + "\n", "utf8");
  return full;
}

function list({ itemId, limit } = {}) {
  let events = readAll().reverse();
  if (itemId) events = events.filter((e) => e.itemId === itemId);
  if (limit) events = events.slice(0, limit);
  return events;
}

function get(eventId) {
  return readAll().find((e) => e.id === eventId) || null;
}

module.exports = { append, list, get };
