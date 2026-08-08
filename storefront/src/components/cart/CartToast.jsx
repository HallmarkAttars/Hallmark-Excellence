// Presentational Add to Cart notification card. Rendered by ToastProvider via
// portal to <body>; receives the active toast (kind + product) and close
// callback. All text uses the REAL product name — nothing hardcoded.

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  )
}

export default function CartToast({ toast, leaving, onClose }) {
  if (!toast) return null

  const { kind, product } = toast

  return (
    <div className={`cart-toast is-${kind} ${leaving ? 'is-leaving' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="cart-toast-close" onClick={onClose} aria-label="Close notification">
        <CloseIcon />
      </button>

      <div className="cart-toast-body">
        <span className="cart-toast-icon" aria-hidden="true">
          {kind === 'success' ? <CheckIcon /> : <span className="cart-toast-icon-x">✕</span>}
        </span>

        <div className="cart-toast-copy">
          <p className="cart-toast-title">
            {kind === 'success' ? 'Added to Cart' : "Couldn't Add to Cart"}
          </p>
          {kind === 'success' ? (
            <p className="cart-toast-text">
              <strong>{product?.name}</strong> has been added to your cart.
            </p>
          ) : (
            <p className="cart-toast-text">
              Unable to add this product to your cart. Please try again.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
