import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getBrands } from '../services/mockApi'
import { computeBrandBulkStatus, effectiveUnitPrice } from '../utils/bulk'

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
// variant id so different quantity variants (3 ML vs 6 ML) stay separate.
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
    // Selected price is the variant price when a variant exists, otherwise
    // the legacy product price.
    selected_price: Number(raw.selected_price ?? raw.price ?? 0),
    // Brand context — needed for combined brand bulk pricing. Legacy stored
    // carts without brand_id simply skip brand-level discounts until the item
    // is re-added.
    brand_id: raw.brand_id ?? null,
    brand_name: raw.brand_name ?? null,
    // Optional bulk purchasing config (admin-enabled per product). Carried
    // on the line so the cart, checkout and order all use the SAME config
    // the customer saw when adding the item.
    bulk_enabled: Boolean(raw.bulk_enabled),
    bulk_price: raw.bulk_price != null ? Number(raw.bulk_price) : null,
    bulk_min_qty: raw.bulk_min_qty != null ? Number(raw.bulk_min_qty) : null,
    ...(variant
      ? {
          variant_id: raw.variant_id,
          variant_label: raw.variant_label,
          quantity_value: raw.quantity_value,
          quantity_unit: raw.quantity_unit,
          // Whether this line is the product's DEFAULT variant — bulk pricing
          // only ever applies to the default variant.
          variant_is_default: raw.variant_is_default === true,
          stock: raw.stock != null ? Number(raw.stock) : null,
        }
      : {}),
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readStoredCart().map(normalizeItem))
  // Fresh brand rows from the brands API — the single source of truth for
  // combined brand bulk config. Brand bulk is DERIVED from (items × brand
  // data) on every render, never stored, so a config change recalcs
  // immediately.
  const [brandById, setBrandById] = useState({})

  // Fetch brand bulk config. Re-runs on mount and whenever the tab regains
  // focus so a brand toggle flipped by the admin mid-session is picked up
  // without a full page reload.
  useEffect(() => {
    let cancelled = false
    const load = () => {
      getBrands()
        .then((brands) => {
          if (cancelled) return
          const map = {}
          for (const b of brands || []) {
            if (b.id != null) map[String(b.id)] = b
          }
          setBrandById(map)
        })
        .catch(() => {
          // Brand data unavailable (offline / cold start) → brand bulk simply
          // stays off; normal pricing continues to work.
        })
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
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

  const addItem = useCallback((product, qty = 1, variant = null) => {
    setItems((prev) => {
      const hasVariant = Boolean(variant && variant.variant_id != null)

      // Legacy products (no variant) keep using product.price.
      const selected_price = hasVariant ? Number(variant.price) : Number(product.price)

      const newItem = {
        product_id: product.id,
        name: product.name,
        image: product.image,
        quantity: Math.max(1, Number(qty) || 1),
        selected_price,
        // Brand context carried on the line for combined brand bulk pricing.
        brand_id: product.brand_id ?? null,
        brand_name: product.brand_name ?? null,
        // Bulk config is copied from the SELECTED VARIANT at add time (each
        // size has its own bulk price / threshold). Variant-less products
        // fall back to the product-level bulk fields (legacy). The cart line
        // therefore carries the EXACT config the customer saw on the detail
        // page for the size they picked.
        bulk_enabled: hasVariant
          ? Boolean(variant.bulk_enabled)
          : Boolean(product.bulk_enabled),
        bulk_price: hasVariant
          ? (variant.bulk_price != null ? Number(variant.bulk_price) : null)
          : (product.bulk_price != null ? Number(product.bulk_price) : null),
        bulk_min_qty: hasVariant
          ? (variant.bulk_min_qty != null ? Number(variant.bulk_min_qty) : null)
          : (product.bulk_min_qty != null ? Number(product.bulk_min_qty) : null),
        ...(hasVariant
          ? {
              variant_id: variant.variant_id,
              variant_label: variant.variant_label,
              quantity_value: variant.quantity_value,
              quantity_unit: variant.quantity_unit,
              variant_is_default: variant.is_default === true,
              stock: variant.stock != null ? Number(variant.stock) : null,
            }
          : {}),
      }

      // Merge ONLY when BOTH product_id AND variant_id match.
      const existingIndex = prev.findIndex((i) => lineKey(i) === lineKey(newItem))

      if (existingIndex >= 0) {
        const existing = prev[existingIndex]
        const combined = Math.max(1, existing.quantity + newItem.quantity)
        // Respect the selected variant's stock limit when applicable.
        const capped =
          newItem.stock != null ? Math.min(combined, newItem.stock) : combined
        // Refresh the line's bulk config too, so a config change the admin
        // made since the item was first added is picked up on re-add.
        const updated = [...prev]
        updated[existingIndex] = {
          ...existing,
          quantity: capped,
          // Refresh brand context too — a line stored before brand_id existed
          // (legacy cart) must pick up the brand so combined brand bulk can
          // apply to the re-added item.
          brand_id: newItem.brand_id,
          brand_name: newItem.brand_name,
          bulk_enabled: newItem.bulk_enabled,
          bulk_price: newItem.bulk_price,
          bulk_min_qty: newItem.bulk_min_qty,
          variant_is_default: newItem.variant_is_default,
        }
        return updated
      }

      return [...prev, newItem]
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => lineKey(i) !== key))
  }, [])

  const updateQty = useCallback((key, qty) => {
    setItems((prev) =>
      prev.map((i) => {
        if (lineKey(i) !== key) return i
        const max = i.stock != null ? i.stock : Number.MAX_SAFE_INTEGER
        return { ...i, quantity: Math.min(Math.max(1, qty), max) }
      })
    )
  }, [])

  // Clear BOTH layers in one atomic call: the in-memory state AND the
  // persisted copy. clearCart is called only after the backend confirms the
  // order was created, so the customer can never lose an order that failed —
  // and a refresh can never resurrect the old cart from storage. The persist
  // effect then re-writes '[]' after the commit, keeping both layers in sync.
  const clearCart = useCallback(() => {
    // In-memory state always clears. The storage write is best-effort (same
    // tolerance as readStoredCart): persistence must never be able to throw
    // AFTER a successful order and bounce the customer into the error path.
    setItems([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage unavailable — the empty in-memory cart is still correct.
    }
  }, [])

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])

  // --- Derived pricing ------------------------------------------------------
  // Everything below is computed LIVE from (cart items × fresh brand data) on
  // every change — brand bulk discounts are never stored, so toggling a brand
  // off (or removing an item that drops a brand below its threshold) recalculates
  // the effective prices immediately.
  //
  // pricedItems = items + resolved `unit_price` (brand bulk → per-product bulk
  //   → normal) + brand bulk metadata, so Cart.jsx and the checkout summary
  //   show exactly the prices that will be charged.
  // brandStatus = computeBrandBulkStatus(...) for the per-brand banners.
  const { pricedItems, brandStatus, total } = useMemo(() => {
    const status = computeBrandBulkStatus(items, brandById)
    const resolved = items.map((i) => {
      const unit_price = effectiveUnitPrice(i, status)
      const st = i.brand_id != null ? status[String(i.brand_id)] : null
      return {
        ...i,
        unit_price,
        normal_unit_price: Number(i.selected_price ?? i.price ?? 0),
        brand_bulk_applied: Boolean(st?.active),
        brand_bulk_price: st?.active ? Number(st.bulkUnitPrice) : null,
        brand_bulk_min_qty: st?.active ? Number(st.bulkMinQty) : null,
        brand_name: st?.name ?? i.brand_name ?? null,
      }
    })
    const sum = resolved.reduce((acc, i) => acc + i.unit_price * i.quantity, 0)
    return { pricedItems: resolved, brandStatus: status, total: sum }
  }, [items, brandById])

  const value = {
    items,
    // Resolved lines — same shape as items plus unit_price / normal_unit_price
    // / brand_bulk_applied / brand_bulk_price / brand_bulk_min_qty / brand_name.
    pricedItems,
    // Per-brand combined bulk status for the brand banners in Cart.jsx.
    brandStatus,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    itemCount,
    total,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
