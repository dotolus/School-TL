const { classLabelHe } = require("../classLabel");

describe("classLabelHe", () => {
  it("translates a single grade letter to the Hebrew letter at the same alphabet position", () => {
    expect(classLabelHe("e4")).toBe("ה4");
    expect(classLabelHe("a1")).toBe("א1");
  });

  it("is case-insensitive on the grade letter", () => {
    expect(classLabelHe("E4")).toBe("ה4");
  });

  it("translates multiple leading letters", () => {
    expect(classLabelHe("ab12")).toBe("אב12");
  });

  it("leaves a bare letter with no digits translated", () => {
    expect(classLabelHe("e")).toBe("ה");
  });

  it("falls back to the original string for a letter past the 22-letter Hebrew alphabet", () => {
    expect(classLabelHe("w1")).toBe("w1");
  });

  it("falls back to the original string when there is no leading letter", () => {
    expect(classLabelHe("4")).toBe("4");
  });

  it("falls back to the original string for a non-matching shape", () => {
    expect(classLabelHe('"><script>')).toBe('"><script>');
  });

  it("passes through non-string input unchanged", () => {
    expect(classLabelHe(undefined)).toBeUndefined();
  });
});
