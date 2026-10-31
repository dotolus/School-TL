// History entries live in their own persistence-layer collection (see
// server/services/persistence/) rather than embedded in their event. This
// module is read-only: it just asks the active adapter for entries.
const { getRepository } = require("./persistence");

async function list(tag, { itemId, limit } = {}) {
  return getRepository().listHistory(tag, { itemId, limit });
}

async function get(tag, eventId) {
  return getRepository().getHistoryEntry(eventId, tag);
}

module.exports = { list, get };
