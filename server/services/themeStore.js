const fs = require("fs");
const path = require("path");
const { THEMES_FILE, DATA_DIR } = require("../config");

let cache = null;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  if (cache) return cache;
  ensureDataDir();
  if (!fs.existsSync(THEMES_FILE)) {
    cache = { activeThemeId: "paper", themes: [] };
    return cache;
  }
  cache = JSON.parse(fs.readFileSync(THEMES_FILE, "utf8"));
  return cache;
}

function saveAtomic(data) {
  ensureDataDir();
  const tmpFile = path.join(DATA_DIR, `.themes.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpFile, THEMES_FILE);
  cache = data;
}

function getAll() {
  return load();
}

function setActive(themeId) {
  const data = load();
  const exists = data.themes.some((t) => t.id === themeId);
  if (!exists) throw new Error(`Unknown theme id: ${themeId}`);
  data.activeThemeId = themeId;
  saveAtomic(data);
  return data;
}

module.exports = { getAll, setActive };
