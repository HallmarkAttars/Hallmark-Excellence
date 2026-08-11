import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cartTotal, lineUnitPrice } from '../utils/variantPricing'
import { getBrands } from '../services/mockApi'
import {
  buildBrandBulk,
  buildBrandPieces,
  isValidBulkRule,
  lineBulkPricing,
  linePieces,
} from '../utils/brandBulk'

const CartContext = createContext(null)
const STORAGE_KEY = 'ad_cart_v1'

function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Build a stable unique line key. Variant items are keyed by product id +
// variant id so different variants (100 Pieces vs 1000 Pieces) stay separate.
// Legacy items (no variant) are keyed by product id alone.
function lineKey(item) {
  return item.variant_id != null ? `${item.product_id}-v${item.variant_id}` : `${item.product_id}-`
}

// Normalize a stored cart item into the canonical shape used everywhere.
function normalizeItem(raw) {
  const variant = raw.variant_id != null
  return {
    product_id: raw.product_id ?? raw.id,
    name: raw.name,
    image: raw.image,
    quantity: Number(raw.quantity ?? raw.qty ?? 1),
    // Exact piece count for brand bulk lines (quantity stays 1; the line
    // represents `pieces` pieces of the brand).
    ...(raw.pieces != null ? { pieces: Number(raw.pieces) } : {}),
    // The amount charged per ONE unit of this line: the selected variant's
    // TOTAL price, or the legacy product price for variant-less lines.
    selected_price: Number(raw.selected_price ?? raw.price ?? 0),
    // Brand context — kept for display on cart/checkout (never affects price).
    brand_id: raw.brand_id ?? null,
    brand_name: raw.brand_name ?? null,
    ...(variant
      ? {
          variant_id: raw.variant_id,
          variant_label: raw.variant_label,
          quantity_value: raw.quantity_value,
          quantity_unit: raw.quantity_unit,
          // Legacy stored carts may predate the new pricing fields — fall
          // back to the stored selected price so old carts keep working.
          variant_total_price:
            raw.variant_total_price != null
              ? Number(raw.variant_total_price)
              : Number(raw.selected_price ?? raw.price ?? 0),
          variant_price_per_unit:
            raw.variant_price_per_unit != null
              ? Number(raw.variant_price_per_unit)
              : Number(raw.selected_price ?? raw.price ?? 0),
          variant_is_default: raw.variant_is_default === true,
        }
      : {}),
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readStoredCart().map(normalizeItem))

  // Brand rows (active brands only, from the public endpoint) — the single
  // source of truth for brand-level bulk pricing rules. Loaded once at app
  // start; a fetch failure simply leaves bulk pricing off.
  const [brands, setBrands] = useState([])
  useEffect(() => {
    let alive = true
    getBrands()
      .then((list) => {
        if (alive) setBrands(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        // No bulk pricing without brand data — the rest of the cart works.
      })
    return () => {
      alive = false
    }
  }, [])

  // Persist ONLY real changes — never on mount. On first render the storage
  // already holds exactly what was loaded, so writing again is at best
  // redundant and at worst a stale-write hazard (e.g. if the loaded cart is
  // cleared in the same session, the mount write must not resurrect it).
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // Add `qty` units of the selected product/variant to the cart. `pieces` is
  // optional and used ONLY by brand products with an exact piece-count picker
  // (see ProductDetail): the line then represents `pieces` pieces, priced per
  // piece, with quantity kept at 1.
  const addItem = useCallback((product, qty = 1, variant = null, pieces = null) => {
    setItems((prev) => {
      const hasVariant = Boolean(variant && variant.variant_id != null)
      const explicitPieces = pieces != null ? Math.max(1, Math.floor(Number(pieces) || 1)) : null
      const quantity = Math.max(1, Number(qty) || 1)

      // Authoritative NORMAL per-line price: the selected variant's total
      // price (never its price-per-unit), or the product price for
      // variant-less products. Piece-based lines are priced per piece
      // (normalPerPiece × pieces) — the brand bulk discount is applied later
      // in the derived pricing, never stored.
      let selected_price
      if (explicitPieces != null) {
        const normalPerPiece = hasVariant
          ? Number(variant.price_per_unit ?? variant.total_price ?? 0)
          : Number(product.price)
        selected_price = Number.isFinite(normalPerPiece) && normalPerPiece > 0
          ? normalPerPiece * explicitPieces
          : Number(variant?.total_price ?? product.price ?? 0)
      } else {
        selected_price = hasVariant
          ? Number(variant.total_price ?? variant.price)
          : Number(product.price)
      }

      const newItem = {
        product_id: product.id,
        name: product.name,
        image: product.image,
        quantity: explicitPieces != null ? 1 : quantity,
        // Exact piece count (brand bulk lines only).
        ...(explicitPieces != null ? { pieces: explicitPieces } : {}),
        selected_price,
        // Brand context carried on the line for display (never pricing).
        brand_id: product.brand_id ?? null,
        brand_name: product.brand_name ?? null,
        ...(hasVariant
          ? {
              variant_id: variant.variant_id,
              variant_label:
                explicitPieces != null
                  ? `${explicitPieces} ${String(variant.quantity_unit || 'Pieces')}`.trim()
                  : variant.variant_label,
              quantity_value: explicitPieces != null ? explicitPieces : variant.quantity_value,
              quantity_unit: variant.quantity_unit,
              variant_total_price: selected_price,
              variant_price_per_unit: Number(variant.price_per_unit ?? variant.total_price ?? variant.price),
              variant_is_default: variant.is_default === true,
            }
          : {}),
      }

      // Merge ONLY when product_id AND variant_id match.
      const existingIndex = prev.findIndex((i) => lineKey(i) === lineKey(newItem))

      if (existingIndex >= 0) {
        const existing = prev[existingIndex]
        const updated = [...prev]

        if (existing.pieces != null || newItem.pieces != null) {
          // Piece-based lines merge by adding piece counts (quantity stays 1;
          // the same variant shares one normal per-piece price). A legacy
          // pack-based line (no explicit pieces) still contributes its real
          // piece tally (size × quantity) — never 0.
          const existingPieces = existing.pieces != null
            ? Number(existing.pieces) || 0
            : linePieces(existing)
          const combinedPieces = existingPieces + (Number(newItem.pieces ?? 0) || 0)
          updated[existingIndex] = {
            ...existing,
            pieces: combinedPieces,
            quantity: 1,
            quantity_value: combinedPieces,
            variant_label: `${combinedPieces} ${String(newItem.quantity_unit || 'Pieces')}`.trim(),
            selected_price: Number(existing.selected_price ?? 0) + Number(newItem.selected_price ?? 0),
            ...(hasVariant
              ? {
                  variant_total_price: Number(existing.variant_total_price ?? 0) + Number(newItem.variant_total_price ?? 0),
                  variant_price_per_unit: newItem.variant_price_per_unit,
                  variant_is_default: newItem.variant_is_default,
                }
              : {}),
            brand_id: newItem.brand_id,
            brand_name: newItem.brand_name,
          }
          return updated
        }

        const combined = Math.max(1, existing.quantity + newItem.quantity)
        updated[existingIndex] = {
          ...existing,
          quantity: combined,
          // Refresh the price and variant info on re-add — a line stored
          // before the new pricing fields existed (legacy cart) must pick up
          // the current variant total price.
          selected_price: newItem.selected_price,
          ...(hasVariant
            ? {
                variant_total_price: newItem.variant_total_price,
                variant_price_per_unit: newItem.variant_price_per_unit,
                variant_is_default: newItem.variant_is_default,
              }
            : {}),
          brand_id: newItem.brand_id,
          brand_name: newItem.brand_name,
        }
        return updated
      }

      return [...prev, newItem]
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => lineKey(i) !== key))
  }, [])

  // Clear BOTH layers in one atomic call: the in-memory state AND the
  // persisted copy. clearCart is called only after the backend confirms the
  // order was created, so the customer can never lose an order that failed —
  // and a refresh can never resurrect the old cart from storage. The persist
  // effect then re-writes '[]' after the commit, keeping both layers in sync.
  const clearCart = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage unavailable — the empty in-memory cart is still correct.
    }
  }, [])

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])

  // --- Brand-level bulk pricing --------------------------------------------
  // Derived live from the cart + brand rules: no refresh, no manual step.
  // brandBulk:   brand_id → { totalPieces, bulkMinQty, unlocked, … } for
  //              brands in the cart that have a valid rule.
  // brandPieces: brand_id → total pieces in the cart (any brand, for the
  //              progress displays on brand/product pages).
  // bulkRules:   brand_id → the valid rule (for pages with no cart items).
  const brandBulk = useMemo(() => buildBrandBulk(items, brands), [items, brands])
  const brandPieces = useMemo(() => buildBrandPieces(items), [items])
  const bulkRules = useMemo(() => {
    const rules = {}
    for (const b of brands || []) {
      if (isValidBulkRule(b)) rules[String(b.id)] = b
    }
    return rules
  }, [brands])

  // --- Derived pricing ------------------------------------------------------
  // pricedItems = items + resolved `unit_price` so the cart and checkout show
  // exactly the prices that will be charged. Line total = unit_price ×
  // quantity (shared math in utils/variantPricing.js, unit-tested there).
  // When a brand is bulk-unlocked, its lines carry the brand's bulk rate per
  // piece instead of their own normal rate (bulk never raises a price) — the
  // same math the server applies at checkout.
  const { pricedItems, total } = useMemo(() => {
    const resolved = items.map((i) => {
      const baseUnit = lineUnitPrice(i)
      const bulk = i.brand_id != null ? brandBulk[String(i.brand_id)] || null : null
      const pricing = bulk ? lineBulkPricing(i, bulk) : null
      return {
        ...i,
        unit_price: pricing ? pricing.unitPrice : baseUnit,
        normal_unit_price: pricing ? pricing.normalUnitPrice : baseUnit,
        bulk_active: pricing ? pricing.useBulk : false,
        bulk_per_unit: pricing && pricing.useBulk ? pricing.chargedPerPiece : null,
        bulk_min_qty: bulk ? bulk.bulkMinQty : null,
        brand_total_pieces: bulk ? bulk.totalPieces : null,
        brand_name: i.brand_name ?? null,
        // Exact piece count — explicit for piece-based lines, derived for
        // pack-based brand lines (size × quantity).
        ...(pricing ? { pieces: pricing.linePieces } : {}),
      }
    })
    return { pricedItems: resolved, total: cartTotal(resolved) }
  }, [items, brandBulk])

  const value = {
    items,
    // Resolved lines — same shape as items plus unit_price / normal_unit_price
    // / brand_name / bulk fields. unit_price is the per-line amount (variant
    // total price, bulk-adjusted).
    pricedItems,
    addItem,
    removeItem,
    clearCart,
    itemCount,
    total,
    // Brand bulk context for the cart, shop, brand and product pages.
    brands,
    bulkRules,
    brandBulk,
    brandPieces,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
