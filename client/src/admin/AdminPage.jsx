import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useDatasetApi, useDatasetTag } from "../useDatasetApi";
import { LoginForm } from "./LoginForm";
import { ItemForm } from "./ItemForm";
import { ItemList } from "./ItemList";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { HistoryPanel } from "./HistoryPanel";
import { ImportPanel } from "./ImportPanel";
import { BackupPanel } from "./BackupPanel";
import { APP_VERSION } from "../version";

export function AdminPage() {
  const datasetApi = useDatasetApi();
  const tag = useDatasetTag();
  const [isAdmin, setIsAdmin] = useState(null);
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);
  const [historyItemId, setHistoryItemId] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((data) => setIsAdmin(data.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  // The admin login is a sliding-expiry cookie (server/services/adminToken.js),
  // not an indefinite session - api.js dispatches this event from every call
  // site the moment any request comes back 401, so a session that times out
  // mid-visit (e.g. a long-idle edit) bounces back to the login form instead
  // of leaving a broken, silently-failing page on screen.
  useEffect(() => {
    const onSessionExpired = () => {
      setIsAdmin(false);
      setSessionExpired(true);
    };
    window.addEventListener("admin-session-expired", onSessionExpired);
    return () => window.removeEventListener("admin-session-expired", onSessionExpired);
  }, []);

  const loadItems = useCallback(() => {
    datasetApi
      .getTimeline()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message));
  }, [datasetApi]);

  useEffect(() => {
    if (isAdmin) loadItems();
  }, [isAdmin, loadItems]);

  if (isAdmin === null) return <div className="admin-page">טוען...</div>;

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <LoginForm
          onLoggedIn={() => {
            setSessionExpired(false);
            setIsAdmin(true);
          }}
          message={sessionExpired ? "ההתחברות פגה מחוסר פעילות, יש להתחבר מחדש" : null}
        />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <h2>
          ניהול ציר שנת הלימודים <span className="app-version">v{APP_VERSION}</span>
        </h2>
        <p className="active-dataset">
          עריכת ציר הזמן: בית ספר {tag.school} · כיתה {tag.class} · שנת לימודים {tag.period}
        </p>
        <div className="admin-actions">
          <Link className="btn secondary" to={`/${tag.school}/${tag.period}/${tag.class}`}>
            חזרה לציר
          </Link>
          <button
            className="btn danger"
            onClick={() => api.logout().then(() => setIsAdmin(false))}
          >
            התנתקות
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h2>עיצוב</h2>
        <ThemeSwitcher />
      </div>

      <div className="admin-card">
        <h2>הוספת פריט</h2>
        {!showAddForm ? (
          <button className="btn" onClick={() => setShowAddForm(true)}>
            + פריט חדש
          </button>
        ) : (
          <ItemForm
            submitLabel="הוספה"
            onCancel={() => setShowAddForm(false)}
            onSubmit={async (payload) => {
              await datasetApi.addItem(payload);
              setShowAddForm(false);
              loadItems();
            }}
          />
        )}
      </div>

      <div className="admin-card">
        <h2>ייבוא נתונים</h2>
        <ImportPanel onImported={loadItems} />
      </div>

      <div className="admin-card">
        <h2>גיבויים</h2>
        <BackupPanel onRestored={loadItems} />
      </div>

      <div className="admin-card">
        <h2>כל הפריטים</h2>
        {error && <p className="error-text">{error}</p>}
        <ItemList
          items={items}
          onUpdate={async (id, payload) => {
            await datasetApi.updateItem(id, payload);
            loadItems();
          }}
          onDelete={async (id) => {
            await datasetApi.deleteItem(id);
            loadItems();
          }}
          onShowHistory={(id) => setHistoryItemId(id)}
        />
      </div>

      <div className="admin-card">
        <h2>
          היסטוריה ושחזור
          {historyItemId && (
            <>
              {" "}
              <button className="btn secondary" onClick={() => setHistoryItemId(null)}>
                הצגת כל ההיסטוריה (כולל פריטים שנמחקו)
              </button>
            </>
          )}
        </h2>
        <HistoryPanel itemId={historyItemId} onRestored={loadItems} />
      </div>
    </div>
  );
}
