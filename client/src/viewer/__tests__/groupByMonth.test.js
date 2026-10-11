import { groupByMonth } from "../groupByMonth";

function item(m, y, id) {
  return { id, m, y, type: "notice", title: id, short: "x", full: "x", detail: {} };
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
});
