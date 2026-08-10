import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cartTotal, lineUnitPrice } from '../utils/variantPricing'

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

  // Add `qty` units of the selected product/variant to the cart. The line is
  // priced at the selected VARIANT'S TOTAL PRICE × quantity (the quantity is
  // how many units/packs of that variant the customer wants). Adding the same
  // variant again merges into the same line.
  const addItem = useCallback((product, qty = 1, variant = null) => {
    setItems((prev) => {
      const hasVariant = Boolean(variant && variant.variant_id != null)

      // Authoritative per-line price: the selected variant's total price
      // (never its price-per-unit), or the product price for variant-less
      // products.
      const selected_price = hasVariant
        ? Number(variant.total_price ?? variant.price)
        : Number(product.price)

      const quantity = Math.max(1, Number(qty) || 1)

      const newItem = {
        product_id: product.id,
        name: product.name,
        image: product.image,
        quantity,
        selected_price,
        // Brand context carried on the line for display (never pricing).
        brand_id: product.brand_id ?? null,
        brand_name: product.brand_name ?? null,
        ...(hasVariant
          ? {
              variant_id: variant.variant_id,
              variant_label: variant.variant_label,
              quantity_value: variant.quantity_value,
              quantity_unit: variant.quantity_unit,
              variant_total_price: Number(variant.total_price ?? variant.price),
              variant_price_per_unit: Number(variant.price_per_unit ?? variant.total_price ?? variant.price),
              variant_is_default: variant.is_default === true,
            }
          : {}),
      }

      // Merge ONLY when product_id AND variant_id match.
      const existingIndex = prev.findIndex((i) => lineKey(i) === lineKey(newItem))

      if (existingIndex >= 0) {
        const existing = prev[existingIndex]
        const combined = Math.max(1, existing.quantity + newItem.quantity)
        const updated = [...prev]
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

  // --- Derived pricing ------------------------------------------------------
  // pricedItems = items + resolved `unit_price` (= the selected variant's
  // total price, or the product price) so the cart and checkout show exactly
  // the prices that will be charged. Line total = unit_price × quantity
  // (shared math in utils/variantPricing.js, unit-tested there).
  const { pricedItems, total } = useMemo(() => {
    const resolved = items.map((i) => {
      const unit_price = lineUnitPrice(i)
      return {
        ...i,
        unit_price,
        normal_unit_price: unit_price,
        brand_name: i.brand_name ?? null,
      }
    })
    return { pricedItems: resolved, total: cartTotal(resolved) }
  }, [items])

  const value = {
    items,
    // Resolved lines — same shape as items plus unit_price / normal_unit_price
    // / brand_name. unit_price is the per-line amount (variant total price).
    pricedItems,
    addItem,
    removeItem,
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
