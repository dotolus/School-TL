const LEGEND_ITEMS = [
  { kind: "holiday", label: "חג / חופשה" },
  { kind: "test", label: "מבחן" },
  { kind: "notice", label: "הודעה" },
  { kind: "project", label: "עבודה גדולה" },
];

export function Legend() {
  return (
    <div className="legend">
      {LEGEND_ITEMS.map(({ kind, label }) => (
        <span className="chip" key={kind}>
          <span className="dot" style={{ background: `var(--${kind})` }} />
          {label}
        </span>
      ))}
    </div>
  );
}
