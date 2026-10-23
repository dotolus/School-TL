// Persistence contract every DB adapter in this directory must implement.
// server/services/timelineStore.js and server/services/historyStore.js call
// ONLY these methods - never a DB client directly - so swapping the backend
// later means writing one new adapter file; nothing above this layer
// (routes, the client, timelineStore's business rules) changes.
//
// A "tag" is always `{ school, class, period }` - the active dataset.
//
// @typedef {Object} EventRecord
// @property {string} id
// @property {string} school
// @property {string} class
// @property {string} period
// @property {"active"|"deleted"} status
// @property {"holiday"|"test"|"notice"|"project"} type
// @property {number} m
// @property {number} y
// @property {string} title
// @property {string} short
// @property {string} full
// @property {object} detail
// @property {boolean} [required-white-shirt]
// @property {boolean} [required-food]
// @property {string} createdAt
// @property {string} updatedAt
//
// @typedef {Object} HistoryEntry
// @property {string} id
// @property {string} itemId
// @property {string} ts - ISO timestamp
// @property {"create"|"update"|"delete"|"restore"} op
// @property {string} title
// @property {object|null} before - external item snapshot, or null
// @property {object|null} after - external item snapshot, or null
//
// Required methods:
//
//   getActiveEvents(tag) -> Promise<EventRecord[]>
//   getEvent(id, tag) -> Promise<EventRecord|null>
//   createEvent(record: EventRecord, historyEntry: HistoryEntry, tag) -> Promise<void>
//     Atomically writes the event doc and its first history entry.
//   updateActiveEvent(id, tag, computeChange) -> Promise<unknown|null>
//     computeChange(existing: EventRecord) -> {fields: object, historyEntry: HistoryEntry} | null
//     Adapter finds the active, dataset-matching doc (or resolves null
//     without calling computeChange if none exists); computeChange
//     synchronously returns the fields to change plus the new history
//     entry, written atomically. Used for both updateItem and deleteItem
//     (the latter's computeChange just sets status:"deleted").
//   restoreEvent(historyEntryId, tag, computeChange) -> Promise<unknown|null>
//     computeChange(entry: HistoryEntry, eventRecord: EventRecord|null) -> {fields, historyEntry} | null
//     Adapter reads the history entry by id (dataset-matched, regardless of
//     the owning event's status), then the event doc via entry.itemId
//     (regardless of status, passing null if it doesn't exist); writes
//     atomically whatever computeChange returns.
//   listHistory(tag, { itemId, limit }) -> Promise<HistoryEntry[]>  // newest first
//   getHistoryEntry(id, tag) -> Promise<HistoryEntry|null>

const REQUIRED_METHODS = [
  "getActiveEvents",
  "getEvent",
  "createEvent",
  "updateActiveEvent",
  "restoreEvent",
  "listHistory",
  "getHistoryEntry",
];

module.exports = { REQUIRED_METHODS };
