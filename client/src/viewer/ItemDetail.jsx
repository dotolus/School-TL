import { useLightbox } from "./LightboxProvider";

export function ItemDetail({ item }) {
  const d = item.detail || {};
  const lightbox = useLightbox();
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
        {d.images && d.images.length > 0 && (
          <>
            <dt>תמונות</dt>
            <dd>
              <div className="image-thumbs">
                {d.images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    className="image-thumb"
                    onClick={() => lightbox?.open(img.url)}
                  >
                    <img src={img.url} alt="" />
                  </button>
                ))}
              </div>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
