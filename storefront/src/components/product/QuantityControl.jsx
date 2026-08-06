import { useState } from 'react'
import './QuantityControl.css'

// Shared quantity selector used by ProductCard and the Cart page.
//
// ONE source of truth: `value` is always the parent's cart quantity. The
// buttons commit immediately through onChange/onRemove; typing is buffered
// in local `draft` state and committed on Enter or blur — the real cart is
// never touched per keystroke.
//
// Props:
//   value     — current cart quantity (number)
//   max       — stock cap or null (no cap)
//   onChange  — commit a new quantity (number)
//   onRemove  — called when decrementing at 1 (existing cart removal)
//   className — extra class merged onto the wrapper for per-surface styling
//   labels    — optional aria labels override
export default function QuantityControl({ value, max, onChange, onRemove, className = '', labels = {} }) {
  const [draft, setDraft] = useState(null) // string while editing, null when synced to cart

  const cap = (n) => (max != null ? Math.min(n, max) : n)

  const commit = () => {
    const raw = draft == null ? String(value) : draft
    const trimmed = String(raw).trim()
    // Accept only positive whole numbers (no decimals, negatives, letters,
    // exponents or empty input). Anything else restores the previous value.
    const valid = /^\d+$/.test(trimmed)
    const parsed = Number(trimmed)
    const next = valid && parsed >= 1 ? cap(parsed) : value
    setDraft(null)
    if (next !== value) onChange(next)
  }

  const handleDecrease = () => {
    setDraft(null)
    if (value > 1) onChange(cap(value - 1))
    else onRemove()
  }

  const handleIncrease = () => {
    setDraft(null)
    onChange(cap(value + 1))
  }

  return (
    <div className={`qty-control ${className}`} aria-label={labels.label || 'Quantity'}>
      <span className="qty-control-live" role="status" aria-live="polite">{value}</span>
      <button
        type="button"
        className="qty-control-btn"
        onClick={handleDecrease}
        aria-label={labels.decrease || 'Decrease quantity'}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        step="1"
        className="qty-control-input"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setDraft(null)
            e.currentTarget.blur()
          }
        }}
        onFocus={(e) => e.target.select()}
        aria-label={labels.input || 'Quantity'}
      />
      <button
        type="button"
        className="qty-control-btn"
        onClick={handleIncrease}
        aria-label={labels.increase || 'Increase quantity'}
      >
        +
      </button>
    </div>
  )
}
