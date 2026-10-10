const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { TIMELINE_FILE, DATA_DIR } = require("../config");

const VALID_TYPES = new Set(["holiday", "test", "notice", "project"]);

let cache = null;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  if (cache) return cache;
  ensureDataDir();
  if (!fs.existsSync(TIMELINE_FILE)) {
    cache = { items: [] };
    return cache;
  }
  const raw = fs.readFileSync(TIMELINE_FILE, "utf8");
  cache = JSON.parse(raw);
  if (!Array.isArray(cache.items)) cache.items = [];
  return cache;
}

function saveAtomic(data) {
  ensureDataDir();
  const tmpFile = path.join(DATA_DIR, `.timeline.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpFile, TIMELINE_FILE);
  cache = data;
}

function validateItemInput(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Item payload must be an object");
  }
  if (!VALID_TYPES.has(input.type)) {
    throw new Error(`type must be one of ${[...VALID_TYPES].join(", ")}`);
  }
  if (!Number.isInteger(input.m) || input.m < 1 || input.m > 12) {
    throw new Error("m must be an integer month 1-12");
  }
  if (!Number.isInteger(input.y)) {
    throw new Error("y must be an integer year");
  }
  if (!input.title || typeof input.title !== "string") {
    throw new Error("title is required");
  }
  if (!input.short || typeof input.short !== "string") {
    throw new Error("short is required");
  }
  if (!input.full || typeof input.full !== "string") {
    throw new Error("full is required");
  }
  const detail = input.detail || {};
  if (detail.links && !Array.isArray(detail.links)) {
    throw new Error("detail.links must be an array");
  }
  if (detail.words && !Array.isArray(detail.words)) {
    throw new Error("detail.words must be an array");
  }
}

function getAll() {
  return load().items;
}

function addItem(input) {
  validateItemInput(input);
  const data = load();
  const item = {
    id: crypto.randomUUID(),
    type: input.type,
    m: input.m,
    y: input.y,
    title: input.title,
    short: input.short,
    full: input.full,
    detail: input.detail || {},
  };
  data.items.push(item);
  saveAtomic(data);
  return item;
}

function updateItem(id, input) {
  validateItemInput(input);
  const data = load();
  const idx = data.items.findIndex((it) => it.id === id);
  if (idx === -1) return null;
  const updated = { ...data.items[idx], ...input, id };
  data.items[idx] = updated;
  saveAtomic(data);
  return updated;
}

function deleteItem(id) {
  const data = load();
  const idx = data.items.findIndex((it) => it.id === id);
  if (idx === -1) return false;
  data.items.splice(idx, 1);
  saveAtomic(data);
  return true;
}

module.exports = { getAll, addItem, updateItem, deleteItem, validateItemInput };
