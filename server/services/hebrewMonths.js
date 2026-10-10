// Month number (1-12) -> Hebrew label, shared by validation and rendering.
const HEBREW_MONTHS = {
  1: "ינואר",
  2: "פברואר",
  3: "מרץ",
  4: "אפריל",
  5: "מאי",
  6: "יוני",
  7: "יולי",
  8: "אוגוסט",
  9: "ספטמבר",
  10: "אוקטובר",
  11: "נובמבר",
  12: "דצמבר",
};

function nameForMonth(m) {
  return HEBREW_MONTHS[m] || String(m);
}

module.exports = { HEBREW_MONTHS, nameForMonth };
