const crypto = require("crypto");
const { getDb } = require("./db");
const { ACTIVE_SCHOOL, ACTIVE_CLASS, ACTIVE_PERIOD } = require("../config");

const VALID_TYPES = new Set(["holiday", "test", "notice", "project"]);

function activeDatasetFilter() {
  return { school: ACTIVE_SCHOOL, class: ACTIVE_CLASS, period: ACTIVE_PERIOD };
}

async function events() {
  const db = await getDb();
  return db.collection("events");
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
  if (detail.images && !Array.isArray(detail.images)) {
    throw new Error("detail.images must be an array");
  }
  if (
    input["required-white-shirt"] !== undefined &&
    typeof input["required-white-shirt"] !== "boolean"
  ) {
    throw new Error("required-white-shirt must be a boolean");
  }
  if (input["required-food"] !== undefined && typeof input["required-food"] !== "boolean") {
    throw new Error("required-food must be a boolean");
  }
}

// Strips the internal-only fields (school/class/period/status/history/_id
// timestamps) so every API response keeps the exact same item shape the
// file-based store used to return.
function toExternalItem(doc) {
  if (!doc) return null;
  return {
    id: doc._id,
    type: doc.type,
    m: doc.m,
    y: doc.y,
    title: doc.title,
    short: doc.short,
    full: doc.full,
    detail: doc.detail || {},
    "required-white-shirt": Boolean(doc["required-white-shirt"]),
    "required-food": Boolean(doc["required-food"]),
  };
}

function fieldsFromInput(input) {
  return {
    type: input.type,
    m: input.m,
    y: input.y,
    title: input.title,
    short: input.short,
    full: input.full,
    detail: input.detail || {},
    "required-white-shirt": Boolean(input["required-white-shirt"]),
    "required-food": Boolean(input["required-food"]),
  };
}

function makeHistoryEntry(partial) {
  return { id: crypto.randomUUID(), ts: new Date().toISOString(), ...partial };
}

async function getAll() {
  const col = await events();
  const docs = await col.find({ ...activeDatasetFilter(), status: "active" }).toArray();
  return docs.map(toExternalItem);
}

async function getItem(id) {
  const col = await events();
  const doc = await col.findOne({ ...activeDatasetFilter(), status: "active", _id: id });
  return toExternalItem(doc);
}

async function addItem(input) {
  validateItemInput(input);
  const col = await events();
  const now = new Date().toISOString();
  const item = {
    _id: crypto.randomUUID(),
    ...activeDatasetFilter(),
    status: "active",
    ...fieldsFromInput(input),
    createdAt: now,
    updatedAt: now,
  };
  const external = toExternalItem(item);
  item.history = [makeHistoryEntry({ op: "create", itemId: item._id, title: item.title, before: null, after: external })];
  await col.insertOne(item);
  return external;
}

async function updateItem(id, input) {
  validateItemInput(input);
  const col = await events();
  const existing = await col.findOne({ ...activeDatasetFilter(), status: "active", _id: id });
  if (!existing) return null;

  const before = toExternalItem(existing);
  const after = { ...before, ...fieldsFromInput(input), id };
  const entry = makeHistoryEntry({ op: "update", itemId: id, title: after.title, before, after });

  await col.updateOne(
    { _id: id },
    { $set: { ...fieldsFromInput(after), updatedAt: new Date().toISOString() }, $push: { history: entry } }
  );
  return after;
}

async function deleteItem(id) {
  const col = await events();
  const existing = await col.findOne({ ...activeDatasetFilter(), status: "active", _id: id });
  if (!existing) return false;

  const before = toExternalItem(existing);
  const entry = makeHistoryEntry({ op: "delete", itemId: id, title: before.title, before, after: null });

  await col.updateOne(
    { _id: id },
    { $set: { status: "deleted", updatedAt: new Date().toISOString() }, $push: { history: entry } }
  );
  return true;
}

async function importItems(inputItems) {
  if (!Array.isArray(inputItems)) {
    throw new Error("items must be an array");
  }
  const errors = [];
  inputItems.forEach((input, index) => {
    try {
      validateItemInput(input);
    } catch (err) {
      errors.push({ index, error: err.message });
    }
  });
  if (errors.length) {
    const err = new Error("Import validation failed");
    err.details = errors;
    throw err;
  }

  const result = { created: 0, updated: 0 };

  // Validation already ran up-front (pure, no DB access) so a bad item
  // never gets here; what's left is a sequence of single-document writes,
  // each atomic on its own but not as one all-or-nothing transaction across
  // documents the way the old single-file write was. Acceptable for this
  // app's scale/demo-data status - flagged here rather than silently assumed.
  for (const input of inputItems) {
    if (input.id) {
      const updated = await updateItem(input.id, input);
      if (updated) {
        result.updated += 1;
        continue;
      }
    }
    await addItem(input);
    result.created += 1;
  }

  return result;
}

async function restoreFromHistory(eventId) {
  const col = await events();
  const doc = await col.findOne({ ...activeDatasetFilter(), "history.id": eventId });
  if (!doc) return null;

  const entry = doc.history.find((h) => h.id === eventId);
  if (!entry) return null;
  const snapshot = entry.op === "delete" ? entry.before : entry.after;
  if (!snapshot) return null;

  const previousState = doc.status === "active" ? toExternalItem(doc) : null;
  const restored = { ...snapshot, id: doc._id };
  const restoreEntry = makeHistoryEntry({
    op: "restore",
    itemId: restored.id,
    title: restored.title,
    before: previousState,
    after: restored,
  });

  await col.updateOne(
    { _id: doc._id },
    {
      $set: { ...fieldsFromInput(restored), status: "active", updatedAt: new Date().toISOString() },
      $push: { history: restoreEntry },
    }
  );
  return restored;
}

module.exports = {
  getAll,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  validateItemInput,
  importItems,
  restoreFromHistory,
};
