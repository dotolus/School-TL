import { Outlet, useParams } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";

// A period in this app is always a school-year range ("2026-2027"), never a
// plain slug like a school or class name - so when it doesn't look like
// one, the three URL segments are most likely just in the wrong order.
// This can't catch every reordering (a school and a class are both free-form
// slugs with no structural difference - see ViewerPage's empty-state hint
// for that case), but it catches the common one where the period ends up
// in the wrong slot.
const PERIOD_PATTERN = /^\d{4}-\d{4}$/;

export function DatasetGate() {
  const { period } = useParams();
  if (!PERIOD_PATTERN.test(period)) {
    return <NotFoundPage />;
  }
  return <Outlet />;
}
