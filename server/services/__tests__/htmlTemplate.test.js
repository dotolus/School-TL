const fs = require("fs");
const os = require("os");
const path = require("path");

describe("escapeHtml", () => {
  it("escapes &, <, >, \", and '", () => {
    const { escapeHtml } = require("../htmlTemplate");
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("parseDatasetSlugs", () => {
  it("parses a bare viewer path", () => {
    const { parseDatasetSlugs } = require("../htmlTemplate");
    expect(parseDatasetSlugs("/reut/2026-2027/e4")).toEqual({
      school: "reut", period: "2026-2027", class: "e4",
    });
  });

  it("parses the same path with an /admin suffix", () => {
    const { parseDatasetSlugs } = require("../htmlTemplate");
    expect(parseDatasetSlugs("/reut/2026-2027/e4/admin")).toEqual({
      school: "reut", period: "2026-2027", class: "e4",
    });
  });

  it("returns null for the bare root", () => {
    const { parseDatasetSlugs } = require("../htmlTemplate");
    expect(parseDatasetSlugs("/")).toBeNull();
  });

  it("returns null for a two-segment path", () => {
    const { parseDatasetSlugs } = require("../htmlTemplate");
    expect(parseDatasetSlugs("/reut/2026-2027")).toBeNull();
  });
});

describe("buildMetaTags", () => {
  function fakeReq(path, originalUrl = path) {
    return { path, protocol: "https", get: () => "reutl.vercel.app", originalUrl };
  }

  it("builds dataset-scoped Hebrew title/description and escapes slugs", () => {
    const { buildMetaTags } = require("../htmlTemplate");
    const meta = buildMetaTags(fakeReq('/reut/2026-2027/"><script>'));
    expect(meta.title).toBe('ציר שנת הלימודים – בית ספר reut, כיתה &quot;&gt;&lt;script&gt;');
    expect(meta.description).toContain("&lt;script&gt;");
    expect(meta.description).not.toContain("<script>");
  });

  it("builds the generic fallback for a non-dataset path", () => {
    const { buildMetaTags } = require("../htmlTemplate");
    const meta = buildMetaTags(fakeReq("/"));
    expect(meta.title).toBe("ציר שנת הלימודים");
    expect(meta.description).toBe("לוח אירועים, חגים ומבחנים לאורך שנת הלימודים");
  });

  it("builds absolute image/page URLs from the request", () => {
    const { buildMetaTags } = require("../htmlTemplate");
    const meta = buildMetaTags(fakeReq("/reut/2026-2027/e4", "/reut/2026-2027/e4?x=1"));
    expect(meta.imageUrl).toBe("https://reutl.vercel.app/og-image.jpg");
    expect(meta.pageUrl).toBe("https://reutl.vercel.app/reut/2026-2027/e4?x=1");
  });
});

describe("renderIndexHtml", () => {
  it("substitutes all four tokens from a template on disk", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "htmlTemplate-"));
    fs.writeFileSync(
      path.join(tmpDir, "index.html"),
      '<title>__OG_TITLE__</title><meta content="__OG_DESCRIPTION__"><meta content="__OG_IMAGE__"><meta content="__OG_URL__">'
    );
    process.env.CLIENT_DIST = tmpDir;
    // Both modules destructure config at require-time, so a stale
    // require.cache entry would keep serving the previous CLIENT_DIST -
    // same CJS-cache-busting concern server/__tests__/testApp.js documents.
    delete require.cache[require.resolve("../../config")];
    delete require.cache[require.resolve("../htmlTemplate")];
    const { renderIndexHtml } = require("../htmlTemplate");
    const html = renderIndexHtml({
      path: "/reut/2026-2027/e4", protocol: "https", get: () => "x.test", originalUrl: "/reut/2026-2027/e4",
    });
    expect(html).toContain("ציר שנת הלימודים – בית ספר reut, כיתה e4");
    expect(html).toContain("https://x.test/og-image.jpg");
    expect(html).not.toContain("__OG_");
    delete process.env.CLIENT_DIST;
  });
});
