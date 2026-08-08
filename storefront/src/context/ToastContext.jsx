import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CartToast from '../components/cart/CartToast'
import '../components/cart/CartToast.css'

// ONE shared Add to Cart notification system for the whole storefront.
// The provider keeps a single active toast — the newest success/error
// replaces the previous one (no uncontrolled stack). Auto-dismisses after
// AUTO_DISMISS_MS; exit animation runs before the toast is removed.
// Rendered via portal to <body> so it sits above every surface.

const ToastContext = createContext(null)

const AUTO_DISMISS_MS = 3500
const EXIT_MS = 260

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { id, kind: 'success' | 'error', product }
  const [leaving, setLeaving] = useState(false)
  const dismissTimer = useRef(null)
  const exitTimer = useRef(null)
  const idRef = useRef(0)

  const clearTimers = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    if (exitTimer.current) clearTimeout(exitTimer.current)
  }

  // Remove the toast after the exit animation (used by the × button and
  // auto-dismiss).
  const closeToast = useCallback(() => {
    clearTimers()
    setLeaving(true)
    exitTimer.current = setTimeout(() => {
      setLeaving(false)
      setToast(null)
    }, EXIT_MS)
  }, [])

  // Show a toast, replacing any current one. Restarts the auto-dismiss clock.
  const showToast = useCallback(
    (kind, product) => {
      clearTimers()
      setLeaving(false)
      setToast({ id: ++idRef.current, kind, product })
      dismissTimer.current = setTimeout(closeToast, AUTO_DISMISS_MS)
    },
    [closeToast]
  )

  // Called ONLY after the existing addItem operation has actually succeeded.
  const notifyAddSuccess = useCallback((product) => showToast('success', product), [showToast])
  // Called when the existing addItem operation throws — real errors are never hidden.
  const notifyAddError = useCallback(() => showToast('error', null), [showToast])

  // Clean up timers on provider unmount.
  useEffect(() => () => clearTimers(), [])

  const value = { notifyAddSuccess, notifyAddError }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="cart-toast-region" role="status" aria-live="polite">
          <CartToast toast={toast} leaving={leaving} onClose={closeToast} />
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
