// Chooses the active persistence adapter. timelineStore.js/historyStore.js
// call getRepository() and never require an adapter file directly, so
// adding a second backend later and switching is a one-line config change
// (DB_PROVIDER), not a code change in callers.
const { DB_PROVIDER } = require("../../config");

function loadAdapter(provider) {
  switch (provider) {
    case "firestore":
      return require("./firestoreAdapter");
    default:
      throw new Error(`Unknown DB_PROVIDER "${provider}" - see server/services/persistence/contract.js`);
  }
}

let adapter = null;
function getRepository() {
  if (!adapter) adapter = loadAdapter(DB_PROVIDER);
  return adapter;
}

module.exports = { getRepository };
