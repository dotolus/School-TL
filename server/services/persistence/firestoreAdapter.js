// Firestore implementation of the persistence contract (./contract.js).
// This is the only module allowed to import firebase-admin or know that
// Firestore exists - timelineStore.js/historyStore.js only ever call the
// contract methods exported here.
// firebase-admin v12+'s default entry point only exposes the legacy
// namespaced API's shell (no admin.apps/admin.app()/admin.credential) -
// the real implementation lives in these modular submodules.
const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID } = require("../../config");

function initApp() {
  if (getApps().length) return getApp();
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  if (!usingEmulator && !FIREBASE_SERVICE_ACCOUNT) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set and FIRESTORE_EMULATOR_HOST is not set - see .env.example"
    );
  }
  const options = { projectId: FIREBASE_PROJECT_ID };
  if (FIREBASE_SERVICE_ACCOUNT) options.credential = cert(FIREBASE_SERVICE_ACCOUNT);
  return initializeApp(options);
}

let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    const app = initApp();
    dbInstance = getFirestore(app);
    // Mongo silently dropped undefined-valued fields; Firestore throws by
    // default. This restores the old lenient behavior.
    //
    // `app` (unlike this module) survives test-suite require.cache clearing
    // between tests - firebase-admin itself lives under node_modules, which
    // is never cleared - so settings() would otherwise be called a second
    // time on the same already-started Firestore instance and throw. Stash
    // the "already configured" flag on the app object itself so it survives
    // this module being reloaded.
    if (!app.__eqPptFirestoreConfigured) {
      dbInstance.settings({ ignoreUndefinedProperties: true });
      app.__eqPptFirestoreConfigured = true;
    }
    console.log(`[firestoreAdapter] Firestore ready (project "${FIREBASE_PROJECT_ID}")`);
  }
  return dbInstance;
}

function eventsCol() {
  return getDb().collection("events");
}
function historyCol() {
  return getDb().collection("history");
}
function backupsCol() {
  return getDb().collection("backups");
}

function omit(obj, keys) {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}

function matchesTag(data, tag) {
  return data.school === tag.school && data.class === tag.class && data.period === tag.period;
}

async function getActiveEvents(tag) {
  const snap = await eventsCol()
    .where("school", "==", tag.school)
    .where("class", "==", tag.class)
    .where("period", "==", tag.period)
    .where("status", "==", "active")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getEvent(id, tag) {
  const doc = await eventsCol().doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.status !== "active" || !matchesTag(data, tag)) return null;
  return { id: doc.id, ...data };
}

async function createEvent(record, historyEntry, tag) {
  const db = getDb();
  const eventRef = eventsCol().doc(record.id);
  const historyRef = historyCol().doc(historyEntry.id);
  const eventFields = omit(record, ["id"]);
  const entryFields = omit(historyEntry, ["id"]);
  await db.runTransaction(async (tx) => {
    tx.set(eventRef, eventFields);
    tx.set(historyRef, { ...tag, ...entryFields });
  });
}

async function updateActiveEvent(id, tag, computeChange) {
  const db = getDb();
  const eventRef = eventsCol().doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(eventRef);
    if (!snap.exists) return null;
    const data = snap.data();
    if (data.status !== "active" || !matchesTag(data, tag)) return null;

    const change = computeChange({ id: snap.id, ...data });
    if (!change) return null;
    const { fields, historyEntry } = change;

    tx.update(eventRef, fields);
    tx.set(historyCol().doc(historyEntry.id), { ...tag, ...omit(historyEntry, ["id"]) });
    return fields;
  });
}

async function restoreEvent(historyEntryId, tag, computeChange) {
  const db = getDb();
  const historyRef = historyCol().doc(historyEntryId);
  return db.runTransaction(async (tx) => {
    const historySnap = await tx.get(historyRef);
    if (!historySnap.exists) return null;
    const historyData = historySnap.data();
    if (!matchesTag(historyData, tag)) return null;
    const entry = { id: historySnap.id, ...omit(historyData, ["school", "class", "period"]) };

    const eventRef = eventsCol().doc(entry.itemId);
    const eventSnap = await tx.get(eventRef);
    let eventRecord = null;
    if (eventSnap.exists) {
      const eventData = eventSnap.data();
      if (!matchesTag(eventData, tag)) return null; // wrong dataset - treat as not found
      eventRecord = { id: eventSnap.id, ...eventData };
    }

    const change = computeChange(entry, eventRecord);
    if (!change) return null;
    const { fields, historyEntry } = change;

    // eventRef is guaranteed to exist here: computeChange's contract requires
    // it to return null when eventRecord is null (see timelineStore.js).
    tx.update(eventRef, fields);
    tx.set(historyCol().doc(historyEntry.id), { ...tag, ...omit(historyEntry, ["id"]) });
    return fields;
  });
}

async function listHistory(tag, { itemId, limit } = {}) {
  let query = historyCol()
    .where("school", "==", tag.school)
    .where("class", "==", tag.class)
    .where("period", "==", tag.period);
  if (itemId) query = query.where("itemId", "==", itemId);

  const snap = await query.get();
  const entries = snap.docs.map((doc) => ({
    id: doc.id,
    ...omit(doc.data(), ["school", "class", "period"]),
  }));
  // Sorted/limited in app code rather than via Firestore orderBy, so no
  // composite index is required (see CLAUDE.md persistence notes).
  entries.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return limit ? entries.slice(0, Number(limit)) : entries;
}

async function getHistoryEntry(id, tag) {
  const doc = await historyCol().doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!matchesTag(data, tag)) return null;
  return { id: doc.id, ...omit(data, ["school", "class", "period"]) };
}

// The backup record's own `id` is just a calendar date ("2027-01-01") -
// unique per dataset, not globally. The Firestore document id has to be
// unique *across* datasets too, or two datasets backing up on the same date
// would silently overwrite each other's document (`.doc(id).set()` fully
// replaces whatever was there). Composing the doc id from the tag plus the
// date keeps them separate while the public `id` field stays just the date,
// so the API/UI shape is unaffected.
function backupDocId(tag, id) {
  return `${tag.school}__${tag.class}__${tag.period}__${id}`;
}

async function createBackup(record, tag) {
  await backupsCol().doc(backupDocId(tag, record.id)).set({ ...tag, ...record });
}

async function listBackups(tag) {
  const snap = await backupsCol()
    .where("school", "==", tag.school)
    .where("class", "==", tag.class)
    .where("period", "==", tag.period)
    .get();
  const entries = snap.docs.map((doc) => {
    const data = doc.data();
    return { id: data.id, createdAt: data.createdAt, itemCount: data.itemCount };
  });
  // Sorted in app code rather than via Firestore orderBy, same rationale as
  // listHistory - avoids needing a composite index.
  entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return entries;
}

async function getBackup(id, tag) {
  const doc = await backupsCol().doc(backupDocId(tag, id)).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!matchesTag(data, tag)) return null;
  return { id: data.id, ...omit(data, ["school", "class", "period", "id"]) };
}

module.exports = {
  getActiveEvents,
  getEvent,
  createEvent,
  updateActiveEvent,
  restoreEvent,
  listHistory,
  getHistoryEntry,
  createBackup,
  listBackups,
  getBackup,
  // Not part of the persistence contract - exported only for one-off
  // scripts (scripts/migrate-to-firestore.js, scripts/import-to-firestore.js,
  // e2e/start-server.js) that need to seed/export raw Firestore data
  // directly, the same way the old scripts/migrate-to-mongo.js imported
  // server/services/db.js's getDb() directly.
  getDb,
};
