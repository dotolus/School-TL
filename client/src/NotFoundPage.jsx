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

export function NotFoundPage() {
  const params = useParams();
  const missing = FIELD_ORDER.filter((key) => !params[key]);
  const allMissing = missing.length === FIELD_ORDER.length;

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-code">404</div>
        <div className="not-found-rail" aria-hidden="true" />
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
      </div>
    </div>
  );
}
