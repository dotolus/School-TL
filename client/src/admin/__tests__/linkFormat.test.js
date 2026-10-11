import { linksToText, textToLinks } from "../linkFormat";

describe("linkFormat", () => {
  it("round-trips a real link", () => {
    const links = [{ label: "Site", url: "https://example.com" }];
    expect(textToLinks(linksToText(links))).toEqual([
      { label: "Site", url: "https://example.com", ph: false },
    ]);
  });

  it("round-trips a placeholder link marked with |ph", () => {
    const text = linksToText([{ label: "Form", url: "#", ph: true }]);
    expect(text).toBe("Form|#|ph");
    expect(textToLinks(text)).toEqual([{ label: "Form", url: "#", ph: true }]);
  });

  it("parses multiple lines and skips blank ones", () => {
    const parsed = textToLinks("A|https://a.com\n\nB|https://b.com");
    expect(parsed).toEqual([
      { label: "A", url: "https://a.com", ph: false },
      { label: "B", url: "https://b.com", ph: false },
    ]);
  });

  it("defaults a missing url to '#'", () => {
    expect(textToLinks("Label only")).toEqual([{ label: "Label only", url: "#", ph: false }]);
  });

  it("returns an empty string for no links", () => {
    expect(linksToText([])).toBe("");
    expect(linksToText(undefined)).toBe("");
  });
});
