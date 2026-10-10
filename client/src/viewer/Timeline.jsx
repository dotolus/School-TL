import { MonthBlock } from "./MonthBlock";

export function Timeline({ months, currentKey, currentMonthRef }) {
  return (
    <div className="timeline">
      {months.map((month) => {
        const key = `${month.y}-${month.m}`;
        const isCurrent = key === currentKey;
        return (
          <MonthBlock
            month={month}
            isCurrent={isCurrent}
            monthRef={isCurrent ? currentMonthRef : null}
            key={key}
          />
        );
      })}
    </div>
  );
}
