import { useRef, useState } from "react";
import { api } from "../api";

export function ImageManager({ itemId, initialImages }) {
  const [images, setImages] = useState(initialImages || []);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const handleUpload = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.uploadItemImage(itemId, file);
      setImages(updated.detail?.images || []);
      fileInput.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (imageId) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.deleteItemImage(itemId, imageId);
      setImages(updated.detail?.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="image-thumbs">
        {images.map((img) => (
          <div key={img.id} style={{ position: "relative" }}>
            <div className="image-thumb">
              <img src={img.url} alt="" />
            </div>
            <button
              type="button"
              className="btn danger"
              style={{ position: "absolute", top: -8, insetInlineEnd: -8, padding: "2px 7px" }}
              onClick={() => handleDelete(img.id)}
              disabled={busy}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="admin-row" style={{ marginTop: 10 }}>
        <input type="file" accept="image/*" ref={fileInput} disabled={busy} />
        <button type="button" className="btn secondary" onClick={handleUpload} disabled={busy}>
          העלאה
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
