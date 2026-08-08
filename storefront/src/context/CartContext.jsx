import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applicableUnitPrice } from '../utils/bulk'

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

  useEffect(() => {
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

  const clearCart = useCallback(() => setItems([]), [])

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  // Line total = applicable unit price (bulk once unlocked) × quantity.
  const total = useMemo(
    () => items.reduce((sum, i) => sum + applicableUnitPrice(i) * i.quantity, 0),
    [items]
  )

  const value = { items, addItem, removeItem, updateQty, clearCart, itemCount, total }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
