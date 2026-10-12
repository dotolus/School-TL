import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { LoginForm } from "./LoginForm";
import { ItemForm } from "./ItemForm";
import { ItemList } from "./ItemList";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { HistoryPanel } from "./HistoryPanel";
import { ImportPanel } from "./ImportPanel";
import { APP_VERSION } from "../version";

export function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);
  const [historyItemId, setHistoryItemId] = useState(null);

  useEffect(() => {
    api
      .me()
      .then((data) => setIsAdmin(data.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  const loadItems = () => {
    api
      .getTimeline()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (isAdmin) loadItems();
  }, [isAdmin]);

  if (isAdmin === null) return <div className="admin-page">טוען...</div>;

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <LoginForm onLoggedIn={() => setIsAdmin(true)} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <h2>
          ניהול ציר שנת הלימודים <span className="app-version">v{APP_VERSION}</span>
        </h2>
        <div className="admin-actions">
          <Link className="btn secondary" to="/">
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
              await api.addItem(payload);
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
        <h2>כל הפריטים</h2>
        {error && <p className="error-text">{error}</p>}
        <ItemList
          items={items}
          onUpdate={async (id, payload) => {
            await api.updateItem(id, payload);
            loadItems();
          }}
          onDelete={async (id) => {
            await api.deleteItem(id);
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
