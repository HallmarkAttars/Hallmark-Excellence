import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cartTotal, lineUnitPrice, getDefaultVariant } from '../utils/variantPricing'
import { getBrands } from '../services/mockApi'
import { adjustLinePieces, cartLineKey, getLineMinQuantity, mergeCartLines } from '../utils/cartLines'
import {
  buildBrandBulk,
  buildBrandPieces,
  isValidBulkRule,
  lineBulkPricing,
  lineNormalPerPiece,
  round2,
} from '../utils/brandBulk'

const CartContext = createContext(null)
const STORAGE_KEY = 'ad_cart_v1'

function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return (Array.isArray(parsed) ? parsed : []).map(normalizeItem).filter(Boolean)
  } catch {
    return []
  }
}

// Normalize a stored cart item into the canonical shape used everywhere.
function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const variantId = raw.variantId ?? raw.variant_id ?? raw.variant?.id ?? null
  const hasVariant = variantId != null && String(variantId) !== 'null' && String(variantId) !== 'undefined'
  const quantity = Math.max(1, Math.floor(Number(raw.quantity ?? raw.qty ?? 1)))
  const unitStr = String(raw.quantity_unit ?? raw.variant?.quantity_unit ?? '').trim().toLowerCase()
  const isPiece =
    unitStr === 'pieces' ||
    raw.variantPieces != null ||
    raw.totalPieces != null ||
    raw.pieces != null ||
    (raw.variant_label && String(raw.variant_label).toLowerCase().includes('piece'))

  const variantPieces = Math.max(
    1,
    Math.floor(
      Number(
        raw.variantPieces ??
        raw.selectedVariant ??
        raw.quantity_value ??
        (raw.totalPieces && quantity > 0 ? Math.round(raw.totalPieces / quantity) : null) ??
        (raw.pieces && quantity > 0 ? Math.round(raw.pieces / quantity) : null) ??
        1
      )
    )
  )

  const totalPieces = Math.max(
    1,
    Math.floor(
      Number(
        raw.totalPieces ??
        (raw.pieces != null ? raw.pieces : (isPiece ? variantPieces * quantity : quantity))
      )
    )
  )

  const packagePrice = Number(
    raw.variant_total_price ??
    raw.selected_price ??
    (raw.totalPrice && quantity > 0 ? raw.totalPrice / quantity : null) ??
    lineUnitPrice(raw)
  )

  const piecePrice = Number(
    raw.unitPrice ??
    raw.price_per_unit ??
    raw.variant_price_per_unit ??
    (isPiece && variantPieces > 0 ? packagePrice / variantPieces : packagePrice)
  )

  const totalPrice = Number(
    raw.totalPrice ??
    raw.total_price ??
    round2(packagePrice * quantity)
  )

  const minQuantity = raw.min_quantity != null
    ? Math.max(1, Math.floor(Number(raw.min_quantity)))
    : (raw.min_qty != null
        ? Math.max(1, Math.floor(Number(raw.min_qty)))
        : 1)

  return {
    productId: raw.productId ?? raw.product_id ?? raw.id,
    product_id: raw.product_id ?? raw.productId ?? raw.id,
    variantId: hasVariant ? variantId : null,
    variant_id: hasVariant ? variantId : null,
    variantPieces: isPiece ? variantPieces : 1,
    quantity,
    totalPieces: isPiece ? totalPieces : quantity,
    unitPrice: piecePrice,
    unit_price: packagePrice,
    totalPrice,
    total_price: totalPrice,
    selectedVariant: isPiece ? variantPieces : (raw.selectedVariant ?? null),
    name: raw.name || 'Fragrance',
    image: raw.image,
    stock: raw.stock != null ? Number(raw.stock) : null,
    is_in_stock: raw.is_in_stock !== undefined ? Boolean(raw.is_in_stock) : true,
    min_quantity: minQuantity,
    ...(raw.pieces != null ? { pieces: Number(raw.pieces) } : {}),
    selected_price: packagePrice,
    brand_id: raw.brand_id ?? null,
    brand_name: raw.brand_name ?? null,
    ...(Array.isArray(raw.variants) ? { variants: raw.variants } : {}),
    ...(hasVariant
      ? {
          variantId: variantId,
          variant_id: variantId,
          variantPieces: isPiece ? variantPieces : 1,
          totalPieces: isPiece ? totalPieces : quantity,
          unitPrice: piecePrice,
          unit_price: packagePrice,
          totalPrice,
          total_price: totalPrice,
          selectedVariant: isPiece ? variantPieces : (raw.selectedVariant ?? null),
          variant_label: raw.variant_label ?? raw.variant?.label ?? raw.variant?.display_label ?? (isPiece ? `${variantPieces} Pieces` : ''),
          quantity_value: variantPieces,
          quantity_unit: raw.quantity_unit ?? raw.variant?.quantity_unit ?? (isPiece ? 'Pieces' : ''),
          min_quantity: minQuantity,
          variant_total_price: packagePrice,
          variant_price_per_unit: piecePrice,
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
    mergeCartLines(readStoredCart().map(normalizeItem).filter(Boolean))
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
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      }
    } catch {
      // Storage unavailable
    }
  }, [items])

  // Add `qty` packages of the selected product/variant to the cart.
  const addItem = useCallback((product, qty = 1, variant = null, pieces = null) => {
    if (!product) return
    setItems((prev) => {
      const activeDefaultVar = getDefaultVariant(product)
      const variantObj = variant || (activeDefaultVar ? activeDefaultVar : null)
      const rawVariantId = variantObj?.variantId ?? variantObj?.variant_id ?? product?.variantId ?? variantObj?.id ?? null
      const hasVariant = rawVariantId != null && String(rawVariantId) !== 'null' && String(rawVariantId) !== 'undefined'
      const variantId = hasVariant ? rawVariantId : null
      const quantity = Math.max(1, Number(qty ?? product?.quantity) || 1)

      const unitStr = String(product?.quantity_unit ?? variantObj?.quantity_unit ?? '').trim().toLowerCase()
      const isPiece =
        unitStr === 'pieces' ||
        product?.variantPieces != null ||
        product?.pieces != null ||
        pieces != null

      const variantPieces = Math.max(
        1,
        Math.floor(
          Number(
            product?.variantPieces ??
            product?.selectedVariant ??
            variantObj?.variantPieces ??
            variantObj?.selectedVariant ??
            variantObj?.quantity_value ??
            (pieces && quantity > 0 ? Math.round(pieces / quantity) : null) ??
            1
          )
        )
      )

      const totalPieces = Math.max(
        1,
        Math.floor(
          Number(
            product?.totalPieces ??
            pieces ??
            (isPiece ? variantPieces * quantity : quantity)
          )
        )
      )

      const packagePrice = Number(
        variantObj?.variant_total_price ??
        (hasVariant ? (variantObj?.total_price ?? variantObj?.price) : product?.price) ??
        lineUnitPrice(product) ??
        0
      )

      const piecePrice = Number(
        product?.unitPrice ??
        variantObj?.unitPrice ??
        variantObj?.price_per_unit ??
        (isPiece && variantPieces > 0 ? packagePrice / variantPieces : packagePrice)
      )

      const totalPrice = Number(
        product?.totalPrice ??
        round2(packagePrice * quantity)
      )

      const minQuantity = hasVariant && variantObj
        ? Math.max(
            1,
            Math.floor(
              Number(
                variantObj.min_quantity ??
                variantObj.min_qty ??
                1
              ) || 1
            )
          )
        : Math.max(1, Math.floor(Number(product.min_quantity ?? product.min_qty) || 1))

      const newItem = {
        productId: product.productId ?? product.id,
        product_id: product.id,
        variantId,
        variant_id: variantId,
        variantPieces: isPiece ? variantPieces : 1,
        quantity,
        totalPieces: isPiece ? totalPieces : quantity,
        unitPrice: piecePrice,
        unit_price: packagePrice,
        totalPrice,
        total_price: totalPrice,
        selectedVariant: isPiece ? variantPieces : (product?.selectedVariant ?? null),
        name: product.name,
        image: product.image,
        stock: product.stock != null ? Number(product.stock) : null,
        is_in_stock: product.is_in_stock !== undefined ? Boolean(product.is_in_stock) : true,
        min_quantity: minQuantity,
        ...(pieces != null ? { pieces: Number(pieces) } : (product?.pieces != null ? { pieces: Number(product.pieces) } : {})),
        selected_price: packagePrice,
        brand_id: product.brand_id ?? null,
        brand_name: product.brand_name ?? null,
        ...(Array.isArray(product.variants) ? { variants: product.variants } : {}),
        ...(hasVariant && variantObj
          ? {
              variantId,
              variant_id: variantId,
              variantPieces: isPiece ? variantPieces : 1,
              totalPieces: isPiece ? totalPieces : quantity,
              unitPrice: piecePrice,
              unit_price: packagePrice,
              totalPrice,
              total_price: totalPrice,
              selectedVariant: isPiece ? variantPieces : null,
              variant_label:
                variantObj.variant_label ||
                variantObj.display_label ||
                (isPiece ? `${variantPieces} Pieces` : ''),
              quantity_value: variantPieces,
              quantity_unit: variantObj.quantity_unit || (isPiece ? 'Pieces' : ''),
              min_quantity: minQuantity,
              variant_total_price: packagePrice,
              variant_price_per_unit: piecePrice,
              variant_is_default: variantObj.is_default === true,
            }
          : {}),
      }

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
      const resolvedTotalPieces = pricing ? pricing.linePieces : (i.totalPieces ?? (i.variantPieces ? i.variantPieces * i.quantity : i.quantity))
      const resolvedUnitPrice = pricing && pricing.isPiecePriced
        ? pricing.chargedPerPiece
        : (i.unitPrice ?? (pricing ? pricing.unitPrice : baseUnit))
      const resolvedTotalPrice = pricing && pricing.isPiecePriced
        ? round2(pricing.chargedPerPiece * resolvedTotalPieces)
        : round2((pricing ? pricing.unitPrice : baseUnit) * i.quantity)

      return {
        ...i,
        variantId: i.variantId ?? i.variant_id ?? null,
        variantPieces: i.variantPieces ?? 1,
        quantity: i.quantity,
        totalPieces: resolvedTotalPieces,
        unitPrice: resolvedUnitPrice,
        totalPrice: resolvedTotalPrice,
        min_quantity: getLineMinQuantity(i),
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
