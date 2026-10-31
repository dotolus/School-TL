import { useEffect, useState } from "react";
import { useDatasetApi } from "../useDatasetApi";

const OP_LABEL = { create: "נוצר", update: "עודכן", delete: "נמחק", restore: "שוחזר" };
const OP_COLOR = { create: "notice", update: "project", delete: "test", restore: "holiday" };

function formatTs(ts) {
  return new Date(ts).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

export function HistoryPanel({ itemId, onRestored }) {
  const api = useDatasetApi();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    api
      .getHistory({ itemId, limit: 100 })
      .then((data) => setEvents(data.events))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [itemId, api]);

  const handleRestore = async (eventId) => {
    setBusyId(eventId);
    setError(null);
    try {
      await api.restoreHistoryEvent(eventId);
      load();
      onRestored?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      {events.length === 0 && <p className="meta">אין היסטוריה להצגה.</p>}
      <div className="admin-item-list">
        {events.map((ev) => {
          const color = OP_COLOR[ev.op] || "notice";
          return (
            <div className="admin-item-row" key={ev.id}>
              <div>
                <div>
                  <span
                    className="kind-badge"
                    style={{ background: `var(--${color}-bg)`, color: `var(--${color})` }}
                  >
                    {OP_LABEL[ev.op] || ev.op}
                  </span>{" "}
                  {ev.title}
                </div>
                <div className="meta">{formatTs(ev.ts)}</div>
              </div>
              <button
                className="btn secondary"
                disabled={busyId === ev.id}
                onClick={() => handleRestore(ev.id)}
              >
                שחזור
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
