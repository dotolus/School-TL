import { Link } from "react-router-dom";
import { useDatasetTag } from "../useDatasetApi";
import { APP_VERSION } from "../version";

export function Footer() {
  const { school, period, class: cls } = useDatasetTag();

  return (
    <footer className="note">
      <b>לגבי התאריכים:</b> פתיחת שנה״ל וחגי תשפ״ז מבוססים על לוח החופשות הציבורי של משרד
      החינוך; טווחי סוכות, חנוכה וסיום שנה״ל מסומנים כ״בקירוב״ ורצוי לאמת מול לוח בית הספר
      הספציפי. פריטי המבחנים, ההודעות והעבודות הם <b>דוגמאות לעריכה</b> — כדי להתאים אותם, היכנסו
      לעמוד <Link to={`/${school}/${period}/${cls}/admin`}>הניהול</Link> וערכו, הוסיפו או מחקו פריטים משם.
      <p className="app-version">גרסה {APP_VERSION}</p>
    </footer>
  );
}
