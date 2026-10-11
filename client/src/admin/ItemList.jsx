import { useState } from "react";
import { ItemForm } from "./ItemForm";

const KIND_LABEL = { holiday: "חג / חופשה", test: "מבחן", notice: "הודעה", project: "עבודה גדולה" };

export function ItemList({ items, onUpdate, onDelete, onShowHistory }) {
  const [editingId, setEditingId] = useState(null);

  const sorted = [...items].sort((a, b) => a.y - b.y || a.m - b.m);

  return (
    <div className="admin-item-list">
      {sorted.map((item) =>
        editingId === item.id ? (
          <div className="admin-item-row" key={item.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <ItemForm
              initial={item}
              submitLabel="שמירה"
              onCancel={() => setEditingId(null)}
              onSubmit={async (payload) => {
                await onUpdate(item.id, payload);
                setEditingId(null);
              }}
            />
          </div>
        ) : (
          <div className="admin-item-row" key={item.id}>
            <div>
              <div>{item.title}</div>
              <div className="meta">
                {item.short} · {KIND_LABEL[item.type] || item.type}
              </div>
            </div>
            <div className="admin-actions">
              <button className="btn secondary" onClick={() => setEditingId(item.id)}>
                ערוך
              </button>
              <button className="btn secondary" onClick={() => onShowHistory?.(item.id)}>
                היסטוריה
              </button>
              <button className="btn danger" onClick={() => onDelete(item.id)}>
                מחק
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
