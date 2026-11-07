const fs = require("fs");
const path = require("path");
const { CLIENT_DIST } = require("../config");

const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

const DATASET_PATH_RE = /^\/([^/]+)\/([^/]+)\/([^/]+)(?:\/admin)?\/?$/;
function parseDatasetSlugs(pathname) {
  const match = DATASET_PATH_RE.exec(pathname);
  if (!match) return null;
  const [, school, period, cls] = match;
  return { school, period, class: cls };
}

const GENERIC_TITLE = "ציר שנת הלימודים";
const GENERIC_DESCRIPTION = "לוח אירועים, חגים ומבחנים לאורך שנת הלימודים";

function buildMetaTags(req) {
  const slugs = parseDatasetSlugs(req.path);
  const origin = `${req.protocol}://${req.get("host")}`;
  const imageUrl = `${origin}/og-image.jpg`;
  const pageUrl = `${origin}${req.originalUrl}`;
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
  return cachedTemplate
    .replaceAll("__OG_TITLE__", meta.title)
    .replaceAll("__OG_DESCRIPTION__", meta.description)
    .replaceAll("__OG_IMAGE__", meta.imageUrl)
    .replaceAll("__OG_URL__", meta.pageUrl);
}

module.exports = { escapeHtml, parseDatasetSlugs, buildMetaTags, renderIndexHtml };
