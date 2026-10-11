export function linksToText(links) {
  return (links || []).map((l) => [l.label, l.url, l.ph ? "ph" : ""].filter(Boolean).join("|")).join("\n");
}

export function textToLinks(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url, ph] = line.split("|").map((p) => (p || "").trim());
      return { label, url: url || "#", ph: ph === "ph" };
    });
}
