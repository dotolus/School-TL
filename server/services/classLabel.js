// Class codes follow a grade-letter + section-number scheme (e.g. "e4" = grade
// "e" (5th grade), section 4). The grade letter is translated to the Hebrew
// letter at the same position in the Hebrew alphabet (22 letters, no vowels) -
// not a transliteration, just matching ordinal position: a->א (1st), e->ה
// (5th), etc. The section number is left as-is.
const HEBREW_ALPHABET = "אבגדהוזחטיכלמנסעפצקרשת";

const CLASS_CODE_RE = /^([A-Za-z]+)(\d*)$/;

function letterToHebrew(letter) {
  const index = letter.toLowerCase().charCodeAt(0) - "a".charCodeAt(0);
  return index >= 0 && index < HEBREW_ALPHABET.length ? HEBREW_ALPHABET[index] : null;
}

function classLabelHe(cls) {
  if (typeof cls !== "string") return cls;
  const match = CLASS_CODE_RE.exec(cls);
  if (!match) return cls;
  const [, letters, digits] = match;
  const hebrewLetters = [...letters].map(letterToHebrew);
  if (hebrewLetters.some((letter) => letter === null)) return cls;
  return `${hebrewLetters.join("")}${digits}`;
}

module.exports = { classLabelHe };
