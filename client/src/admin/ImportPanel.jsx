import { useRef, useState } from "react";
import { api } from "../api";

export function ImportPanel({ onImported }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);
  const [result, setResult] = useState(null);
  const fileInput = useRef(null);

  const handleImport = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setDetails(null);
    setResult(null);
    try {
      const data = await api.importTimeline(file);
      setResult(data);
      fileInput.current.value = "";
      onImported?.();
    } catch (err) {
      setError(err.message);
      setDetails(err.details || null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p>
        בחרו קובץ JSON במבנה הזהה לפלט של <code>GET /api/timeline</code> (אובייקט עם מערך{" "}
        <code>items</code>, או מערך פריטים בלבד). פריטים עם <code>id</code> קיים יעודכנו, פריטים
        חדשים יתווספו.
      </p>
      <div className="admin-row">
        <input type="file" accept="application/json,.json" ref={fileInput} disabled={busy} />
        <button type="button" className="btn secondary" onClick={handleImport} disabled={busy}>
          ייבוא
        </button>
      </div>
      {result && (
        <p>
          ייבוא הושלם: {result.created} פריטים נוספו, {result.updated} פריטים עודכנו.
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      {details && (
        <ul className="error-text">
          {details.map((d) => (
            <li key={d.index}>
              פריט #{d.index}: {d.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
