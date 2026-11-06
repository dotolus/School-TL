import { useEffect, useState } from "react";
import { useAttachmentViewer } from "./AttachmentViewerProvider";
import { useBlobUrl } from "./useBlobUrl";

const ICON_BY_KIND = { pdf: "📄", text: "📝", zip: "🗜️" };

function wordsToTextFile(words) {
  return words.map((w) => `${w},`).join("\n");
}

function WordListDownload({ words }) {
  const [url, setUrl] = useState(null);
  // The object URL is created inside the effect (not via useMemo) so React
  // 18 StrictMode's dev-only mount→cleanup→remount simulation creates and
  // revokes its own URL each time it re-runs the effect, instead of revoking
  // a memoized URL that the rendered <a> is still pointing at.
  useEffect(() => {
    const bytes = new TextEncoder().encode("﻿" + wordsToTextFile(words));
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "text/plain;charset=utf-8" }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [words]);
  return (
    <a href={url} download="רשימת-מילים.txt" className="word-list-download">
      הורדת רשימת מילים
    </a>
  );
}

function AttachmentRow({ attachment: a, onPreview }) {
  const downloadUrl = useBlobUrl(a.url);
  return (
    <div className="attachment-item">
      {a.kind === "image" ? (
        <button type="button" className="image-thumb" onClick={onPreview}>
          <img src={a.url} alt="" />
        </button>
      ) : (
        <div className="attachment-thumb">
          <span>{ICON_BY_KIND[a.kind]}</span>
          <span>{a.filename}</span>
          {a.kind !== "zip" && (
            <button type="button" className="btn secondary" onClick={onPreview}>
              תצוגה מקדימה
            </button>
          )}
        </div>
      )}
      <a href={downloadUrl} download={a.filename} className="btn secondary">
        הורדה
      </a>
    </div>
  );
}

export function ItemDetail({ item }) {
  const d = item.detail || {};
  const viewer = useAttachmentViewer();
  return (
    <div className="detail">
      <dl>
        <dt>תאריך</dt>
        <dd>{item.full}</dd>
        {item["required-white-shirt"] && (
          <>
            <dt>לבוש</dt>
            <dd>יש להביא / ללבוש חולצה לבנה</dd>
          </>
        )}
        {item["required-food"] && (
          <>
            <dt>אוכל</dt>
            <dd>יש להביא אוכל / חטיף</dd>
          </>
        )}
        {item["required-parent-signature"] && (
          <>
            <dt>אישור הורים</dt>
            <dd>יש להחזיר אישור הורים חתום</dd>
          </>
        )}
        {d.generalInfo && (
          <>
            <dt>מידע כללי</dt>
            <dd>{d.generalInfo}</dd>
          </>
        )}
        {d.pages && (
          <>
            <dt>עמודים בספר</dt>
            <dd>{d.pages}</dd>
          </>
        )}
        {d.words && d.words.length > 0 && (
          <>
            <dt>רשימת מילים</dt>
            <dd>
              <div className="word-list">
                {d.words.map((w, i) => (
                  <span key={i} dir="ltr">{w}</span>
                ))}
                <WordListDownload words={d.words} />
              </div>
            </dd>
          </>
        )}
        {d.links && d.links.length > 0 && (
          <>
            <dt>קישורים</dt>
            <dd>
              <div className="links">
                {d.links.map((l, i) =>
                  l.ph ? (
                    <span className="ph" key={i}>
                      🔗 {l.label} — הוסיפו כאן את הקישור האמיתי
                    </span>
                  ) : (
                    <a href={l.url} target="_blank" rel="noopener noreferrer" key={i}>
                      🔗 {l.label}
                    </a>
                  )
                )}
              </div>
            </dd>
          </>
        )}
        {d.attachments && d.attachments.length > 0 && (
          <>
            <dt>קבצים מצורפים</dt>
            <dd>
              <div className="image-thumbs">
                {d.attachments.map((a) => (
                  <AttachmentRow
                    key={a.id}
                    attachment={a}
                    onPreview={() => viewer?.open({ url: a.url, mimeType: a.mimeType, filename: a.filename, kind: a.kind })}
                  />
                ))}
              </div>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
