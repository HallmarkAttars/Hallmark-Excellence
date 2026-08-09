import './AnimatedCheck.css'

// Premium animated success checkmark — the shared visual language used by
// the Order Tracking search success and the Order Placed confirmation.
//
// Sequence (pure CSS, ~0.9s): the gold ring draws itself, then the checkmark
// strokes itself in, while the whole badge pops 0.7 → 1 with a subtle gold
// glow. Renders NOTHING but the animation — it never implies an order
// status; the surrounding text owns that meaning. Respects
// prefers-reduced-motion (instant, static checkmark).
//
//   <AnimatedCheck size={76} className="order-success-badge" />
export default function AnimatedCheck({ size = 88, className = '' }) {
  return (
    <span
      className={`animated-check${className ? ` ${className}` : ''}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 52 52">
        <circle className="animated-check-circle" cx="26" cy="26" r="24" />
        <path className="animated-check-mark" d="M15 27.5l7.5 7.5L37 19.5" />
      </svg>
    </span>
  )
}
