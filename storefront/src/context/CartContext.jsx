import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

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
    ...(variant
      ? {
          variant_id: raw.variant_id,
          variant_label: raw.variant_label,
          quantity_value: raw.quantity_value,
          quantity_unit: raw.quantity_unit,
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
        ...(hasVariant
          ? {
              variant_id: variant.variant_id,
              variant_label: variant.variant_label,
              quantity_value: variant.quantity_value,
              quantity_unit: variant.quantity_unit,
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
        const updated = [...prev]
        updated[existingIndex] = { ...existing, quantity: capped }
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
  // Subtotal = selected_price × quantity; total = sum of all lines.
  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.selected_price * i.quantity, 0),
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
