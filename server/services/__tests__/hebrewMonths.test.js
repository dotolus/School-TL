const { HEBREW_MONTHS, nameForMonth } = require("../hebrewMonths");

describe("hebrewMonths", () => {
  it("has all 12 months", () => {
    expect(Object.keys(HEBREW_MONTHS)).toHaveLength(12);
  });

  it("maps known month numbers to Hebrew names", () => {
    expect(nameForMonth(9)).toBe("ספטמבר");
    expect(nameForMonth(1)).toBe("ינואר");
  });

  it("falls back to the raw value for an unknown month", () => {
    expect(nameForMonth(13)).toBe("13");
  });
});
