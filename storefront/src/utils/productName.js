// Render-time product-name normalization for product cards.
//
// Every storefront card shares ONE typography system (the .product-card-name
// rule renders in Cormorant Garamond via --font-display). The problem is the
// CATALOG DATA: Attar names are stored naturally ("Pink Musk", "Sports Polo")
// while other categories store names in ALL CAPS ("VAMPIRE BLOOD", "PEACH",
// "ZARA RED VANILLA iff"). In the serif display face, all-caps text reads as
// a completely different engraved style — exactly the inconsistency reported
// on the shop / category / brand / search cards.
//
// This helper normalizes ONLY shouty (uppercase-dominant) names into the same
// natural title case as the Attar cards. Stored data is never modified and
// names that are already in a natural case pass through byte-for-byte
// unchanged, so the Attar cards are untouched.

// Genuine abbreviations / brand marks that must keep their caps even inside a
// normalized name (e.g. "YSL HOMME EU" → "YSL Homme EU", "SRK" → "SRK").
const PRESERVED_ACRONYMS = new Set(['SRK', 'YSL', 'EU'])

// Normalize one space-separated token. Tokens that are not pure shout-caps
// keep their stored case exactly ("iff", "Giv", "swiss", "Cr7", "1st").
function normalizeToken(token) {
  if (!/[A-Za-z]/.test(token)) return token // "&", "24" — nothing to fix
  // Alphanumeric labels keep their caps ("9AM", "9PM", "30ML").
  if (/^\d/.test(token) && /[A-Z]/.test(token)) return token
  // Known acronyms keep their caps ("SRK", "YSL", "EU").
  if (PRESERVED_ACRONYMS.has(token)) return token
  // Pure shout-caps token ("VAMPIRE", "PEACH", "QAA'WD", "X-MAN"): lowercase
  // it, then capitalize the first alphabetic character ("&G" → "&G",
  // "QAA'WD" → "Qaa'wd") and the letter after each hyphen ("X-MAN" → "X-Man").
  if (/[A-Z]/.test(token) && token === token.toUpperCase()) {
    const lower = token.toLowerCase()
    const idx = lower.search(/[a-z]/)
    const capped =
      idx === -1 ? lower : lower.slice(0, idx) + lower[idx].toUpperCase() + lower.slice(idx + 1)
    return capped.replace(/-([a-z])/g, (m, c) => `-${c.toUpperCase()}`)
  }
  return token // already natural case — keep as stored
}

export function displayProductName(name) {
  if (name == null) return ''
  const trimmed = String(name).trim()
  if (!trimmed) return ''

  const letters = trimmed.match(/[A-Za-z]/g) || []
  if (letters.length === 0) return trimmed

  // Only predominantly-uppercase names are normalized (e.g. "SOLID SAPIL
  // swiss Arabian"). Names already in a natural case — every Attar name —
  // pass through untouched.
  const upperCount = letters.filter((ch) => ch >= 'A' && ch <= 'Z').length
  if (upperCount / letters.length <= 0.4) return trimmed

  // "X -MAN" → "X-MAN": attach a hyphen that touches a letter on exactly one
  // side. Spaced separator dashes ("HUDSON VALLEY - GISSAH") are untouched.
  const collapsed = trimmed.replace(/([A-Za-z]) -([A-Za-z])/g, '$1-$2')

  return collapsed
    .split(/\s+/)
    .map(normalizeToken)
    .join(' ')
    .trim()
}
