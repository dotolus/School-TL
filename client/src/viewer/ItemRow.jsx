import { ItemDetail } from "./ItemDetail";
import { WhiteShirtIcon } from "./WhiteShirtIcon";

const KIND_LABEL = { holiday: "חג / חופשה", test: "מבחן", notice: "הודעה", project: "עבודה גדולה" };

function ChevronSvg() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ItemRow({ item }) {
  const badge = KIND_LABEL[item.type] || item.type;
  return (
    <div className="row" data-kind={item.type}>
      <div className="rail-cell">
        <div className="seg" />
        <div className="date-tag">{item.short}</div>
      </div>
      <details className="item">
        <summary>
          <div className="s-main">
            <div className="title-row">
              <span className="kind-badge">{badge}</span>
              {item["required-white-shirt"] && <WhiteShirtIcon />}
            </div>
            <div className="title">{item.title}</div>
          </div>
          <ChevronSvg />
        </summary>
        <ItemDetail item={item} />
      </details>
    </div>
  );
}
