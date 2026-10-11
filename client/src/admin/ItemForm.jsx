import { useState } from "react";
import { ImageManager } from "./ImageManager";
import { linksToText, textToLinks } from "./linkFormat";

const TYPES = [
  { value: "holiday", label: "חג / חופשה" },
  { value: "test", label: "מבחן" },
  { value: "notice", label: "הודעה" },
  { value: "project", label: "עבודה גדולה" },
];

function emptyForm() {
  return {
    type: "notice",
    m: "",
    y: "",
    title: "",
    short: "",
    full: "",
    pages: "",
    words: "",
    linksText: "",
    requiredWhiteShirt: false,
    requiredFood: false,
  };
}

function itemToForm(item) {
  if (!item) return emptyForm();
  const d = item.detail || {};
  return {
    type: item.type,
    m: String(item.m),
    y: String(item.y),
    title: item.title,
    short: item.short,
    full: item.full,
    pages: d.pages || "",
    words: (d.words || []).join(", "),
    linksText: linksToText(d.links),
    requiredWhiteShirt: !!item["required-white-shirt"],
    requiredFood: !!item["required-food"],
  };
}

export function ItemForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => itemToForm(initial));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const updateChecked = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        type: form.type,
        m: Number(form.m),
        y: Number(form.y),
        title: form.title,
        short: form.short,
        full: form.full,
        detail: {
          pages: form.pages || undefined,
          words: form.words
            ? form.words.split(",").map((w) => w.trim()).filter(Boolean)
            : undefined,
          links: form.linksText ? textToLinks(form.linksText) : undefined,
        },
        "required-white-shirt": form.requiredWhiteShirt,
        "required-food": form.requiredFood,
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-row">
        <label>
          סוג
          <select value={form.type} onChange={update("type")}>
            {TYPES.map((t) => (
              <option value={t.value} key={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          חודש (1-12)
          <input type="number" min="1" max="12" value={form.m} onChange={update("m")} required />
        </label>
        <label>
          שנה
          <input type="number" value={form.y} onChange={update("y")} required />
        </label>
      </div>
      <label>
        כותרת
        <input type="text" value={form.title} onChange={update("title")} required />
      </label>
      <div className="admin-row">
        <label>
          תאריך קצר (על הציר)
          <input type="text" value={form.short} onChange={update("short")} required />
        </label>
        <label>
          תאריך מלא (בפרטים)
          <input type="text" value={form.full} onChange={update("full")} required />
        </label>
      </div>
      <label>
        עמודים בספר (אופציונלי)
        <input type="text" value={form.pages} onChange={update("pages")} />
      </label>
      <label>
        רשימת מילים, מופרדות בפסיקים (אופציונלי)
        <input type="text" value={form.words} onChange={update("words")} />
      </label>
      <label>
        קישורים, שורה לכל קישור: תווית|כתובת (הוסיפו ‎|ph‎ בסוף לקישור ממלא-מקום)
        <textarea rows={3} value={form.linksText} onChange={update("linksText")} />
      </label>
      <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={form.requiredWhiteShirt}
          onChange={updateChecked("requiredWhiteShirt")}
          style={{ width: "auto" }}
        />
        יש צורך בחולצה לבנה
      </label>
      <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={form.requiredFood}
          onChange={updateChecked("requiredFood")}
          style={{ width: "auto" }}
        />
        יש צורך להביא אוכל
      </label>
      {initial && (
        <label>
          תמונות
          <ImageManager itemId={initial.id} initialImages={initial.detail?.images || []} />
        </label>
      )}
      {error && <p className="error-text">{error}</p>}
      <div className="admin-actions">
        <button className="btn" type="submit" disabled={busy}>
          {submitLabel}
        </button>
        {onCancel && (
          <button className="btn secondary" type="button" onClick={onCancel}>
            ביטול
          </button>
        )}
      </div>
    </form>
  );
}
