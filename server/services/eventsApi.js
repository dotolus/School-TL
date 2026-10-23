// Maps internal timeline items to a stable public shape for external
// consumers (GET /api/events). Decoupled on purpose: the internal item
// model (hyphenated flags, short m/y/short/full field names) can change
// without breaking whatever reads this endpoint.
function toPublicEvent(item) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    month: item.m,
    year: item.y,
    shortDate: item.short,
    fullDate: item.full,
    requiresWhiteShirt: Boolean(item["required-white-shirt"]),
    requiresFood: Boolean(item["required-food"]),
    requiresParentSignature: Boolean(item["required-parent-signature"]),
    detail: {
      pages: item.detail?.pages || null,
      generalInfo: item.detail?.generalInfo || null,
      words: item.detail?.words || [],
      links: (item.detail?.links || []).map((l) => ({
        label: l.label,
        url: l.ph ? null : l.url,
      })),
    },
  };
}

module.exports = { toPublicEvent };
