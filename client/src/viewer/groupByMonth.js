import { HEBREW_MONTHS } from "../hebrewMonths";

// `short` is free text (e.g. "7.9", a range like "11–14.9", or "~25.6" /
// "עד 29.8" with a non-numeric prefix) - there's no dedicated day field.
// The leading 1-2 digit number is the day; an item whose short doesn't
// start with a parseable day sorts last within its month rather than
// jumping to the front.
function leadingDay(short) {
  const match = /\d{1,2}/.exec(short || "");
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

export function groupByMonth(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = `${item.y}-${item.m}`;
    if (!byKey.has(key)) {
      byKey.set(key, { m: item.m, y: item.y, name: HEBREW_MONTHS[item.m], items: [] });
    }
    byKey.get(key).items.push(item);
  }
  const groups = [...byKey.values()].sort((a, b) => a.y - b.y || a.m - b.m);
  for (const group of groups) {
    group.items.sort((a, b) => leadingDay(a.short) - leadingDay(b.short));
  }
  return groups;
}
