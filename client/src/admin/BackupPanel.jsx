import { useEffect, useState } from "react";
import { api } from "../api";

function formatTs(ts) {
  return new Date(ts).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

export function BackupPanel({ onRestored }) {
  const [backups, setBackups] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState(null);

  const load = () => {
    api
      .getBackups()
      .then((data) => setBackups(data.backups))
      .catch((err) => setError(err.message));
  };

  useEffect(load, []);

  const handleBackup = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createBackup();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (id) => {
    setBusy(true);
    setError(null);
    setRestoreSummary(null);
    try {
      const result = await api.restoreBackup(id);
      setRestoreSummary(result);
      onRestored?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="meta">
        גיבוי אוטומטי של כל הנתונים מתבצע כל שבועיים. ניתן גם ליצור גיבוי ידני, ולשחזר מכל גיבוי -
        שחזור מחליף את כל הנתונים הנוכחיים בתוכן הגיבוי.
      </p>
      <div className="admin-row">
        <button className="btn secondary" onClick={handleBackup} disabled={busy}>
          גיבוי עכשיו
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {restoreSummary && (
        <p>
          השחזור הושלם: {restoreSummary.restored.length} פריטים שוחזרו
          {restoreSummary.skipped.length > 0 &&
            `, ${restoreSummary.skipped.length} פריטים לא ניתן היה לשחזר`}
          .
        </p>
      )}
      {backups.length === 0 && <p className="meta">אין עדיין גיבויים.</p>}
      <div className="admin-item-list">
        {backups.map((b) => (
          <div className="admin-item-row" key={b.id}>
            <div>
              <div>{b.id}</div>
              <div className="meta">
                {formatTs(b.createdAt)} · {b.itemCount} פריטים
              </div>
            </div>
            <button className="btn danger" disabled={busy} onClick={() => handleRestore(b.id)}>
              שחזור (מחליף את כל הנתונים הנוכחיים)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
