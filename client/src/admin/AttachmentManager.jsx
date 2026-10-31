import { useRef, useState } from "react";
import { useDatasetApi } from "../useDatasetApi";

const ICON_BY_KIND = { pdf: "📄", text: "📝", zip: "🗜️" };

export function AttachmentManager({ itemId, initialAttachments, onChange }) {
  const api = useDatasetApi();
  const [attachments, setAttachments] = useState(initialAttachments || []);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const handleUpload = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.uploadItemAttachment(itemId, file);
      const next = updated.detail?.attachments || [];
      setAttachments(next);
      onChange?.(next);
      fileInput.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.deleteItemAttachment(itemId, attachmentId);
      const next = updated.detail?.attachments || [];
      setAttachments(next);
      onChange?.(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="image-thumbs">
        {attachments.map((a) => (
          <div key={a.id} style={{ position: "relative" }}>
            {a.kind === "image" ? (
              <div className="image-thumb">
                <img src={a.url} alt="" />
              </div>
            ) : (
              <div className="attachment-thumb">
                <span>{ICON_BY_KIND[a.kind]}</span>
                <span>{a.filename}</span>
              </div>
            )}
            <button
              type="button"
              className="btn danger"
              style={{ position: "absolute", top: -8, insetInlineEnd: -8, padding: "2px 7px" }}
              onClick={() => handleDelete(a.id)}
              disabled={busy}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="admin-row" style={{ marginTop: 10 }}>
        <input
          type="file"
          accept="image/*,application/pdf,text/plain,application/zip,.zip"
          ref={fileInput}
          disabled={busy}
        />
        <button type="button" className="btn secondary" onClick={handleUpload} disabled={busy}>
          העלאה
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
