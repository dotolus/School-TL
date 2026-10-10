import { ItemRow } from "./ItemRow";

export function MonthBlock({ month, isCurrent, monthRef }) {
  return (
    <div
      className={`month${isCurrent ? " current" : ""}`}
      id={`month-${month.y}-${month.m}`}
      ref={monthRef}
    >
      <div className="month-rows">
        <div className="row">
          <div className="rail-cell">
            <div className="seg" />
            <div className="bead-mark" />
          </div>
          <div className="month-head-content">
            <h2>{month.name}</h2>
            <span className="yr">{month.y}</span>
            {isCurrent && <span className="now-pill">החודש הנוכחי</span>}
          </div>
        </div>
        {month.items.map((item) => (
          <ItemRow item={item} key={item.id} />
        ))}
      </div>
    </div>
  );
}
