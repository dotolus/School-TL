import { useAttachmentViewer } from "./AttachmentViewerProvider";

const ICON_BY_KIND = { pdf: "📄", text: "📝", zip: "🗜️" };

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
                  <span key={i}>{w}</span>
                ))}
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
                  <div key={a.id} className="attachment-item">
                    {a.kind === "image" ? (
                      <button
                        type="button"
                        className="image-thumb"
                        onClick={() => viewer?.open({ url: a.url, mimeType: a.mimeType, filename: a.filename, kind: a.kind })}
                      >
                        <img src={a.url} alt="" />
                      </button>
                    ) : (
                      <div className="attachment-thumb">
                        <span>{ICON_BY_KIND[a.kind]}</span>
                        <span>{a.filename}</span>
                        {a.kind !== "zip" && (
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => viewer?.open({ url: a.url, mimeType: a.mimeType, filename: a.filename, kind: a.kind })}
                          >
                            תצוגה מקדימה
                          </button>
                        )}
                      </div>
                    )}
                    <a href={a.url} download={a.filename} className="btn secondary">
                      הורדה
                    </a>
                  </div>
                ))}
              </div>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
