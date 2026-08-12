import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cartTotal, lineUnitPrice } from '../utils/variantPricing'
import { getBrands } from '../services/mockApi'
import { adjustLinePieces, cartLineKey, mergeCartLines } from '../utils/cartLines'
import {
  buildBrandBulk,
  buildBrandPieces,
  isValidBulkRule,
  lineBulkPricing,
  lineNormalPerPiece,
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
  // Load + normalize in one step: a legacy cart that stored the same product
  // as several rows (e.g. Pink Musk 60 Pieces + Pink Musk 100 Pieces) is
  // merged into ONE row here, so no quantity is ever lost or double-counted.
  const [items, setItems] = useState(() =>
    mergeCartLines(readStoredCart().map(normalizeItem))
  )

  // Brand rows (active brands only, from the public endpoint) — the single
  // source of truth for brand-level bulk pricing rules AND the live brand
  // names shown in the header dropdown, footer and cart. Loaded once at app
  // start; a fetch failure simply leaves bulk pricing off and the brand UI
  // empty until the next load.
  const [brands, setBrands] = useState([])
  const [brandsLoaded, setBrandsLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    getBrands()
      .then((list) => {
        if (alive) {
          setBrands(Array.isArray(list) ? list : [])
          setBrandsLoaded(true)
        }
      })
      .catch(() => {
        // No bulk pricing without brand data — the rest of the cart works.
        if (alive) setBrandsLoaded(true)
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
      // in the derived pricing, never stored. normalPerPiece uses the SAME
      // guarded derivation as the pricing util (only a genuine per-piece
      // figure below the line total is trusted; otherwise total ÷ size) so a
      // missing price_per_unit can never inflate a piece line to
      // total × pieces.
      const normalPerPiece = hasVariant
        ? lineNormalPerPiece({
            variant_id: variant.variant_id,
            quantity_unit: variant.quantity_unit,
            quantity_value: variant.quantity_value,
            variant_price_per_unit: Number(variant.price_per_unit ?? variant.total_price ?? 0),
            variant_total_price: Number(variant.total_price ?? variant.price ?? 0),
          })
        : Number(product.price)
      let selected_price
      if (explicitPieces != null) {
        selected_price =
          Number.isFinite(normalPerPiece) && normalPerPiece > 0
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
              variant_price_per_unit: Number.isFinite(normalPerPiece) && normalPerPiece > 0
                ? normalPerPiece
                : Number(variant.price_per_unit ?? variant.total_price ?? variant.price),
              variant_is_default: variant.is_default === true,
            }
          : {}),
      }

      // Merge into the existing cart with the shared line-identity rules
      // (brand lines merge by product id, category lines by product + variant)
      // — the SAME logic that normalizes the cart on load, so add-time and
      // load-time merging can never disagree. Adding the same product again
      // never creates a second row.
      return mergeCartLines([...prev, newItem])
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => cartLineKey(i) !== key))
  }, [])

  // One-piece-at-a-time cart quantity control for BRAND (piece-based) lines
  // only: `delta` is +1 / −1 on the line's exact piece count. The mutation
  // delegates to the shared adjustLinePieces util so the stepper's predicate
  // and the update can never drift — brand ML/Gram lines and category lines
  // are untouched. Every change flows through the same derived pricing, so
  // brand totals, bulk status, prices, savings and subtotals update instantly.
  const updateLinePieces = useCallback((key, delta) => {
    setItems((prev) =>
      prev.map((i) => (cartLineKey(i) !== key ? i : adjustLinePieces(i, delta) ?? i))
    )
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
    // Live brand names by id (from the same /api/brands fetch that drives the
    // bulk rules) — the cart/checkout show the CURRENT database name even for
    // lines added before an Admin rename. Display-only: stored lines keep
    // their snapshot; only the derived view is resolved.
    const brandNameById = new Map((brands || []).map((b) => [String(b.id), b.name]))
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
        // The RESOLVED per-piece price for piece-priced lines of a brand with
        // a rule: the brand's standard price when locked, its bulk price when
        // unlocked. Never the line's own stored (possibly stale) per-piece
        // figure — the cart/checkout per-unit displays must all show this.
        normal_per_piece: pricing && pricing.isPiecePriced ? pricing.chargedPerPiece : null,
        // The applied tier's minimum once unlocked (matches the server's
        // order snapshot), otherwise the first tier's minimum.
        bulk_min_qty: bulk ? (bulk.tier ? bulk.tier.minQuantity : bulk.bulkMinQty) : null,
        brand_total_pieces: bulk ? bulk.totalPieces : null,
        brand_name: (i.brand_id != null ? brandNameById.get(String(i.brand_id)) : undefined) ?? i.brand_name ?? null,
        // Exact piece count — explicit for piece-based lines, derived for
        // pack-based brand lines (size × quantity).
        ...(pricing ? { pieces: pricing.linePieces } : {}),
      }
    })
    return { pricedItems: resolved, total: cartTotal(resolved) }
  }, [items, brandBulk, brands])

  const value = {
    items,
    // Resolved lines — same shape as items plus unit_price / normal_unit_price
    // / brand_name / bulk fields. unit_price is the per-line amount (variant
    // total price, bulk-adjusted).
    pricedItems,
    addItem,
    removeItem,
    updateLinePieces,
    clearCart,
    itemCount,
    total,
    // Brand bulk context for the cart, shop, brand and product pages — plus
    // the shared live brand list used by the header/footer (one fetch, one
    // source of truth for names, active state and display position).
    brands,
    brandsLoaded,
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
