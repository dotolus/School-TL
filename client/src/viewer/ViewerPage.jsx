import { useEffect, useMemo, useRef, useState } from "react";
import { useDatasetApi } from "../useDatasetApi";
import { Masthead } from "./Masthead";
import { Timeline } from "./Timeline";
import { Footer } from "./Footer";
import { groupByMonth } from "./groupByMonth";

export function ViewerPage() {
  const api = useDatasetApi();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const currentMonthRef = useRef(null);

  useEffect(() => {
    api
      .getTimeline()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message));
  }, [api]);

  const months = useMemo(() => (items ? groupByMonth(items) : []), [items]);

  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const currentKey = `${curY}-${curM}`;
  const currentMonth = months.find((m) => `${m.y}-${m.m}` === currentKey);

  const handleJump = () => {
    currentMonthRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page">
      <Masthead
        inRange={!!currentMonth}
        currentMonthName={currentMonth ? `${currentMonth.name} ${currentMonth.y}` : ""}
        onJump={handleJump}
      />

      {error && <p className="error-text">שגיאה בטעינת הנתונים: {error}</p>}
      {!error && items === null && <p>טוען...</p>}
      {!error && items !== null && (
        <Timeline months={months} currentKey={currentKey} currentMonthRef={currentMonthRef} />
      )}

      <Footer />
    </div>
  );
}
