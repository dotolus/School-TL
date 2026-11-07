const fs = require("fs");
const path = require("path");
const { CLIENT_DIST } = require("../config");

const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const DATASET_PATH_RE = /^\/([^/]+)\/([^/]+)\/([^/]+)(?:\/admin)?\/?$/;
function parseDatasetSlugs(pathname) {
  const match = DATASET_PATH_RE.exec(pathname);
  if (!match) return null;
  const [, school, period, cls] = match;
  return { school: safeDecode(school), period: safeDecode(period), class: safeDecode(cls) };
}

const GENERIC_TITLE = "ציר שנת הלימודים";
const GENERIC_DESCRIPTION = "לוח אירועים, חגים ומבחנים לאורך שנת הלימודים";
// These must match client/index.html's static default content exactly -
// renderIndexHtml() below finds-and-replaces these literal strings, it
// doesn't use separate placeholder tokens, so the built file already shows
// correct generic content even if a request bypasses Express entirely
// (e.g. Vercel's static-file-priority routing serving "/" directly).
const DEFAULT_IMAGE_URL = "https://reutl.vercel.app/og-image.jpg";
const DEFAULT_PAGE_URL = "https://reutl.vercel.app/";

function buildMetaTags(req) {
  const slugs = parseDatasetSlugs(req.path);
  const origin = `${req.protocol}://${req.get("host")}`;
  const imageUrl = escapeHtml(`${origin}/og-image.jpg`);
  const pageUrl = escapeHtml(`${origin}${req.originalUrl}`);
  if (!slugs) {
    return { title: GENERIC_TITLE, description: GENERIC_DESCRIPTION, imageUrl, pageUrl };
  }
  const school = escapeHtml(slugs.school);
  const cls = escapeHtml(slugs.class);
  const period = escapeHtml(slugs.period);
  return {
    title: `${GENERIC_TITLE} – בית ספר ${school}, כיתה ${cls}`,
    description: `לוח האירועים, החגים והמבחנים של בית ספר ${school}, כיתה ${cls}, שנת הלימודים ${period}`,
    imageUrl,
    pageUrl,
  };
}

let cachedTemplate = null;
function renderIndexHtml(req) {
  if (cachedTemplate === null) {
    cachedTemplate = fs.readFileSync(path.join(CLIENT_DIST, "index.html"), "utf8");
  }
  const meta = buildMetaTags(req);
  // Function replacers (not plain strings) - String.replaceAll treats a
  // string replacement's $&/$`/$'/$$ as special patterns, which a decoded
  // slug could otherwise use to splice arbitrary template text into the
  // output. A function's return value is always inserted literally.
  //
  // DEFAULT_IMAGE_URL must be replaced before DEFAULT_PAGE_URL: the latter
  // is a literal prefix of the former, so replacing it first would also
  // eat the prefix of every image-URL occurrence.
  return cachedTemplate
    .replaceAll(GENERIC_TITLE, () => meta.title)
    .replaceAll(GENERIC_DESCRIPTION, () => meta.description)
    .replaceAll(DEFAULT_IMAGE_URL, () => meta.imageUrl)
    .replaceAll(DEFAULT_PAGE_URL, () => meta.pageUrl);
}

module.exports = { escapeHtml, parseDatasetSlugs, buildMetaTags, renderIndexHtml };
