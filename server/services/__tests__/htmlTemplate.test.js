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

  it("escapes special characters in the page URL (e.g. a query string with &)", () => {
    const { buildMetaTags } = require("../htmlTemplate");
    const meta = buildMetaTags(fakeReq("/reut/2026-2027/e4", "/reut/2026-2027/e4?a=1&b=2"));
    expect(meta.pageUrl).toBe("https://reutl.vercel.app/reut/2026-2027/e4?a=1&amp;b=2");
  });
});

describe("client/index.html default content (static fallback)", () => {
  it("has real generic content, not bare placeholder tokens, so a request that bypasses rendering still shows something correct", () => {
    const html = fs.readFileSync(path.join(__dirname, "../../../client/index.html"), "utf8");
    expect(html).not.toMatch(/__OG_[A-Z]+__/);
    expect(html).toContain("<title>ציר שנת הלימודים</title>");
    expect(html).toContain('content="לוח אירועים, חגים ומבחנים לאורך שנת הלימודים"');
    expect(html).toMatch(/property="og:image" content="https:\/\/[^"]+\/og-image\.jpg"/);
  });
});

describe("renderIndexHtml", () => {
  function freshRenderIndexHtml(tmpDir) {
    process.env.CLIENT_DIST = tmpDir;
    // Both modules destructure config at require-time, so a stale
    // require.cache entry would keep serving the previous CLIENT_DIST -
    // same CJS-cache-busting concern server/__tests__/testApp.js documents.
    delete require.cache[require.resolve("../../config")];
    delete require.cache[require.resolve("../htmlTemplate")];
    return require("../htmlTemplate").renderIndexHtml;
  }

  it("substitutes the real default title/description/image/url from a template on disk", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "htmlTemplate-"));
    fs.writeFileSync(
      path.join(tmpDir, "index.html"),
      '<title>ציר שנת הלימודים</title>' +
        '<meta content="לוח אירועים, חגים ומבחנים לאורך שנת הלימודים">' +
        '<meta content="https://reutl.vercel.app/og-image.jpg">' +
        '<meta content="https://reutl.vercel.app/">'
    );
    const renderIndexHtml = freshRenderIndexHtml(tmpDir);
    const html = renderIndexHtml({
      path: "/reut/2026-2027/e4", protocol: "https", get: () => "x.test", originalUrl: "/reut/2026-2027/e4",
    });
    expect(html).toContain("ציר שנת הלימודים – בית ספר reut, כיתה e4");
    expect(html).toContain("https://x.test/og-image.jpg");
    delete process.env.CLIENT_DIST;
  });

  it("leaves the generic defaults untouched (no-op substitution) for a non-dataset request", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "htmlTemplate-"));
    fs.writeFileSync(path.join(tmpDir, "index.html"), '<title>ציר שנת הלימודים</title>');
    const renderIndexHtml = freshRenderIndexHtml(tmpDir);
    const html = renderIndexHtml({ path: "/", protocol: "https", get: () => "x.test", originalUrl: "/" });
    expect(html).toContain("<title>ציר שנת הלימודים</title>");
    delete process.env.CLIENT_DIST;
  });

  it("does not corrupt the image URL when the default page URL is a prefix of the default image URL", () => {
    // Regression: DEFAULT_PAGE_URL ("https://reutl.vercel.app/") is a
    // literal prefix of DEFAULT_IMAGE_URL ("https://reutl.vercel.app/og-image.jpg").
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "htmlTemplate-"));
    fs.writeFileSync(
      path.join(tmpDir, "index.html"),
      '<meta property="og:image" content="https://reutl.vercel.app/og-image.jpg" />' +
        '<meta property="og:url" content="https://reutl.vercel.app/" />'
    );
    const renderIndexHtml = freshRenderIndexHtml(tmpDir);
    const html = renderIndexHtml({ path: "/", protocol: "https", get: () => "x.test", originalUrl: "/" });
    expect(html).toContain('property="og:image" content="https://x.test/og-image.jpg"');
    expect(html).toContain('property="og:url" content="https://x.test/"');
    delete process.env.CLIENT_DIST;
  });

  it("does not let a decoded slug's $ patterns splice in template text (replaceAll special-pattern injection)", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "htmlTemplate-"));
    fs.writeFileSync(path.join(tmpDir, "index.html"), "<title>ציר שנת הלימודים</title>");
    const renderIndexHtml = freshRenderIndexHtml(tmpDir);
    const html = renderIndexHtml({
      path: "/reut/2026-2027/%24%26",
      protocol: "https",
      get: () => "x.test",
      originalUrl: "/reut/2026-2027/%24%26",
    });
    expect(html).toContain("כיתה $&amp;</title>");
    expect(html).not.toContain("undefined");
    delete process.env.CLIENT_DIST;
  });
});
