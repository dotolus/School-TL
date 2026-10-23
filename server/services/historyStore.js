// History entries live in their own persistence-layer collection (see
// server/services/persistence/) rather than embedded in their event. This
// module is read-only: it just asks the active adapter for entries.
const { getRepository } = require("./persistence");
const { ACTIVE_SCHOOL, ACTIVE_CLASS, ACTIVE_PERIOD } = require("../config");

function activeDatasetFilter() {
  return { school: ACTIVE_SCHOOL, class: ACTIVE_CLASS, period: ACTIVE_PERIOD };
}

async function list({ itemId, limit } = {}) {
  return getRepository().listHistory(activeDatasetFilter(), { itemId, limit });
}

async function get(eventId) {
  return getRepository().getHistoryEntry(eventId, activeDatasetFilter());
}

module.exports = { list, get };
