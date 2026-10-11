import { useEffect, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.25;

function clamp(scale) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function Lightbox({ url, onClose }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleWheel = (e) => {
    e.preventDefault();
    setScale((s) => clamp(s + (e.deltaY < 0 ? STEP : -STEP)));
  };

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div className="lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
        <button className="btn secondary" onClick={() => setScale((s) => clamp(s - STEP))}>
          −
        </button>
        <button className="btn secondary" onClick={() => setScale(1)}>
          {Math.round(scale * 100)}%
        </button>
        <button className="btn secondary" onClick={() => setScale((s) => clamp(s + STEP))}>
          +
        </button>
        <button className="btn danger" onClick={onClose}>
          סגירה ✕
        </button>
      </div>
      <div className="lightbox-frame" onClick={(e) => e.stopPropagation()} onWheel={handleWheel}>
        <img
          src={url}
          alt=""
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>
    </div>
  );
}
