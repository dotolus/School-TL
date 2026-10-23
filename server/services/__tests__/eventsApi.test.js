const { toPublicEvent } = require("../eventsApi");

describe("eventsApi.toPublicEvent", () => {
  it("maps internal field names to the public camelCase contract", () => {
    const item = {
      id: "abc",
      type: "test",
      title: "Math test",
      m: 3,
      y: 2027,
      short: "16.3",
      full: "Tuesday, 16.3.2027",
      detail: {},
    };
    expect(toPublicEvent(item)).toEqual({
      id: "abc",
      type: "test",
      title: "Math test",
      month: 3,
      year: 2027,
      shortDate: "16.3",
      fullDate: "Tuesday, 16.3.2027",
      requiresWhiteShirt: false,
      requiresFood: false,
      requiresParentSignature: false,
      detail: { pages: null, generalInfo: null, words: [], links: [] },
    });
  });

  it("resolves placeholder links to a null url and keeps real links intact", () => {
    const item = {
      id: "x",
      type: "notice",
      title: "t",
      m: 1,
      y: 2027,
      short: "1.1",
      full: "1.1.2027",
      detail: {
        links: [
          { label: "real", url: "https://example.com" },
          { label: "placeholder", url: "#", ph: true },
        ],
      },
    };
    expect(toPublicEvent(item).detail.links).toEqual([
      { label: "real", url: "https://example.com" },
      { label: "placeholder", url: null },
    ]);
  });

  it("surfaces the required-* flags under their public names", () => {
    const item = {
      id: "x",
      type: "notice",
      title: "t",
      m: 1,
      y: 2027,
      short: "1.1",
      full: "1.1.2027",
      detail: {},
      "required-white-shirt": true,
      "required-food": true,
      "required-parent-signature": true,
    };
    const result = toPublicEvent(item);
    expect(result.requiresWhiteShirt).toBe(true);
    expect(result.requiresFood).toBe(true);
    expect(result.requiresParentSignature).toBe(true);
  });

  it("surfaces detail.generalInfo under the public detail shape", () => {
    const item = {
      id: "x",
      type: "notice",
      title: "t",
      m: 1,
      y: 2027,
      short: "1.1",
      full: "1.1.2027",
      detail: { generalInfo: "arrive 15 minutes early" },
    };
    expect(toPublicEvent(item).detail.generalInfo).toBe("arrive 15 minutes early");
  });
});
