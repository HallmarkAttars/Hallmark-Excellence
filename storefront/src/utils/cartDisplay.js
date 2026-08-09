// ============================================================================
// Cart line-item DISPLAY decisions — storefront/src/pages/Cart.jsx
//
// This module holds ONLY the render gates for a cart line, never pricing.
// effectivePrice / normalPrice / lineSavings arrive pre-computed by the cart
// context (CartContext.jsx + utils/bulk.js); these helpers just decide what
// the row SHOWS, so the gates can be unit-tested as pure functions.
//
//   showStruckUnitPrice  — should the normal per-piece price appear struck
//                          next to the bulk price?
//   hasLineSavings       — is a discount active on this line (drives the
//                          struck total, the saving line, the "You saved" line)?
//   lineTotalDisplay     — the sub-line under the bold line total:
//                          discount  → plain normal TOTAL (price × qty), struck
//                          no discount → the "₹X × qty" breakdown
// ============================================================================

const inr = new Intl.NumberFormat('en-IN')

// Same en-IN formatting the rest of the storefront uses.
export function formatINR(value) {
  return inr.format(value)
}

// Guard for the struck-through normal unit price (e.g. "₹45/piece"):
// only when a bulk discount is genuinely active on this line (bulkBadge is
// set) AND the normal price is really higher than the charged price. A price
// identical to itself is never struck — this is what keeps the "line cheaper
// than its brand bulk price" edge case honest (badge may be present while the
// charged price is the line's own price).
export function showStruckUnitPrice(bulkBadge, normalPrice, effectivePrice) {
  return Boolean(bulkBadge) && Number(normalPrice) > Number(effectivePrice)
}

// Is a discount active on this line? Drives the struck normal total, the
// "Saving ₹X" line and the "You saved ₹X" line.
export function hasLineSavings(lineSavings) {
  return Number(lineSavings) > 0
}

// The sub-line under the bold effective total. With a discount it is the
// PLAIN normal total (normalPrice × quantity) marked struck, so the hierarchy
// reads: bold bulk total → struck normal total → saving. Without a discount
// it keeps the existing "₹X × qty" breakdown, exactly as rendered today.
//
// Returns { struck: boolean, text: string } — the text is ready to render.
export function lineTotalDisplay(normalPrice, quantity, lineSavings) {
  const struck = hasLineSavings(lineSavings)
  const normal = Number(normalPrice)
  const qty = Number(quantity)
  return struck
    ? { struck: true, text: `₹${formatINR(normal * qty)}` }
    : { struck: false, text: `₹${formatINR(normal)} × ${qty}` }
}
