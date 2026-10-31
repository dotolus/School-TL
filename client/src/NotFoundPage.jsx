import { useParams } from "react-router-dom";

const FIELD_ORDER = ["school", "period", "class"];
const FIELD_LABEL = { school: "בית ספר", period: "שנה", class: "כיתה" };
const SINGULAR_HEADING = {
  school: "לא צוין בית ספר בכתובת",
  period: "לא צוינה שנה בכתובת",
  class: "לא צוינה כיתה בכתובת",
};

function hebrewList(items) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} ו${items[items.length - 1]}`;
}

function headingFor(missing) {
  if (missing.length === 1) return SINGULAR_HEADING[missing[0]];
  return `לא צוינו ${hebrewList(missing.map((key) => FIELD_LABEL[key]))} בכתובת`;
}

function examplePathFor(params, missing) {
  return (
    "/" +
    FIELD_ORDER.map((key) => (missing.includes(key) ? `<${FIELD_LABEL[key]}>` : params[key])).join("/")
  );
}

const PERIOD_PATTERN = /^\d{4}-\d{4}$/;

export function NotFoundPage() {
  const params = useParams();
  const missing = FIELD_ORDER.filter((key) => !params[key]);
  const allMissing = missing.length === FIELD_ORDER.length;
  // Reached only via DatasetGate, when all three segments are present but
  // the one in the period slot doesn't look like a school-year range - a
  // strong sign the segments are just in the wrong order (see DatasetGate.jsx).
  const periodLooksWrong = missing.length === 0 && !PERIOD_PATTERN.test(params.period);

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-code">404</div>
        <div className="not-found-rail" aria-hidden="true" />
        {periodLooksWrong ? (
          <>
            <h1>סדר חלקי הכתובת כנראה הפוך</h1>
            <p>
              החלק שאמור להיות שנת הלימודים (<span className="not-found-example">{params.period}</span>)
              אינו בפורמט המוכר (לדוגמה: 2026-2027). הסדר הנכון הוא בית ספר, שנה וכיתה:
              <br />
              <span className="not-found-example">/{"<בית ספר>"}/{"<שנה>"}/{"<כיתה>"}</span>
            </p>
          </>
        ) : (
          <>
            <h1>{headingFor(missing)}</h1>
            <p>
              כדי לצפות בציר הזמן יש להשלים את הכתובת כך:
              <br />
              <span className="not-found-example">{examplePathFor(params, missing)}</span>
            </p>
            {allMissing && (
              <p className="not-found-sample">
                לדוגמה: <span className="not-found-example">/reut/2026-2027/e4</span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
