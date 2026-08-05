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

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product, qty = 1, variant = null) => {
    setItems((prev) => {
      // Items are keyed by product id + variant id so quantity variants
      // (e.g. 3 ML vs 12 ML) are treated as separate cart lines.
      const key = variant ? `${product.id}-${variant.variant_id}` : `${product.id}-`
      const existing = prev.find((i) => i._key === key)

      // When a variant is present, store the complete variant info so the
      // cart can display labels/prices without a further API request.
      // The price always comes from the selected variant when one exists.
      const basePrice = variant ? Number(variant.price) : Number(product.price)
      const newItem = {
        id: product.id,
        _key: key,
        name: product.name,
        price: basePrice,
        image: product.image,
        qty,
        ...(variant
          ? {
              variant_id: variant.variant_id,
              variant_label: variant.variant_label,
              quantity_value: variant.quantity_value,
              quantity_unit: variant.quantity_unit,
              stock: variant.stock,
            }
          : {}),
      }

      if (existing) {
        const combined = Math.max(1, existing.qty + qty)
        // Respect the selected variant's stock limit when applicable.
        const capped =
          variant && variant.stock != null ? Math.min(combined, variant.stock) : combined
        return prev.map((i) => (i._key === key ? { ...i, qty: capped } : i))
      }
      return [...prev, newItem]
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }, [])

  const updateQty = useCallback((key, qty) => {
    setItems((prev) =>
      prev.map((i) =>
        i._key === key
          ? { ...i, qty: i.stock != null ? Math.min(Math.max(1, qty), i.stock) : Math.max(1, qty) }
          : i
      )
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items])
  const total = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.price, 0), [items])

  const value = { items, addItem, removeItem, updateQty, clearCart, itemCount, total }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

