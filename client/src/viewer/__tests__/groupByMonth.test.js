import { groupByMonth } from "../groupByMonth";

function item(m, y, id, short = "x") {
  return { id, m, y, type: "notice", title: id, short, full: "x", detail: {} };
}

describe("groupByMonth", () => {
  it("groups items sharing the same month/year together", () => {
    const groups = groupByMonth([item(9, 2026, "a"), item(9, 2026, "b"), item(10, 2026, "c")]);
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("sorts chronologically across the Dec -> Jan school-year boundary", () => {
    const groups = groupByMonth([item(1, 2027, "jan"), item(12, 2026, "dec"), item(9, 2026, "sep")]);
    expect(groups.map((g) => `${g.y}-${g.m}`)).toEqual(["2026-9", "2026-12", "2027-1"]);
  });

  it("attaches the Hebrew month name", () => {
    const groups = groupByMonth([item(9, 2026, "a")]);
    expect(groups[0].name).toBe("ספטמבר");
  });

  it("returns an empty array for no items", () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it("sorts items within a month by their day, not by insertion order", () => {
    const groups = groupByMonth([
      item(9, 2026, "the-20th", "20–21.9"),
      item(9, 2026, "the-1st", "1.9"),
      item(9, 2026, "the-7th", "7.9"),
      item(9, 2026, "the-28th", "28.9"),
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["the-1st", "the-7th", "the-20th", "the-28th"]);
  });

  it("uses the first day of a day range (e.g. \"11–14.9\") as the sort key", () => {
    const groups = groupByMonth([item(9, 2026, "range", "11–14.9"), item(9, 2026, "single", "2.9")]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["single", "range"]);
  });

  it("tolerates a non-numeric prefix like \"~\" or Hebrew \"עד \" before the day", () => {
    const groups = groupByMonth([
      item(8, 2026, "approx", "~25.8"),
      item(8, 2026, "until", "עד 29.8"),
      item(8, 2026, "early", "5.8"),
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["early", "approx", "until"]);
  });

  it("sorts an item with no parseable day to the end of its month, instead of crashing or jumping to the front", () => {
    const groups = groupByMonth([
      item(9, 2026, "no-date", "לבירור"),
      item(9, 2026, "the-1st", "1.9"),
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["the-1st", "no-date"]);
  });
});
