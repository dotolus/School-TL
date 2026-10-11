import { HEBREW_MONTHS } from "../hebrewMonths";

export function groupByMonth(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = `${item.y}-${item.m}`;
    if (!byKey.has(key)) {
      byKey.set(key, { m: item.m, y: item.y, name: HEBREW_MONTHS[item.m], items: [] });
    }
    byKey.get(key).items.push(item);
  }
  return [...byKey.values()].sort((a, b) => a.y - b.y || a.m - b.m);
}
