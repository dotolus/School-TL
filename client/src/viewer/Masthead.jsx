import { Legend } from "./Legend";
import { NowBar } from "./NowBar";

export function Masthead({ inRange, currentMonthName, onJump }) {
  return (
    <div className="masthead">
      <div className="eyebrow">תשפ״ז · ספטמבר 2026 – אוגוסט 2027</div>
      <h1>ציר שנת הלימודים</h1>
      <p className="sub">
        כל החודשים מ-1 בספטמבר ועד 31 באוגוסט, עם החגים, המבחנים, ההודעות והעבודות הגדולות של
        השנה. לכל פריט תאריך ברור צמוד לקו הציר, ובתוך הכרטיס — פרטים: עמודים בספר, רשימת מילים או
        קישורים.
      </p>
      <Legend />
      <NowBar inRange={inRange} currentMonthName={currentMonthName} onJump={onJump} />
    </div>
  );
}
