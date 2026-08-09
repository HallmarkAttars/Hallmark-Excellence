import { useState } from 'react'
import './SlowLoadNotice.css'

// Small dismissible inline notice shown during a slow (cold-start) load,
// styled consistently with the existing toast/banner language (white card,
// gold border, charcoal text). Only ever rendered when the parent has set
// `show` based on useSlowLoadNotice.
export default function SlowLoadNotice() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="slow-load-notice" role="status" aria-live="polite">
      <span className="slow-load-icon" aria-hidden="true">
        <span className="slow-load-dot" />
      </span>
      <p className="slow-load-text">
        <strong>Just a moment —</strong> waking up our servers. This can take
        up to 30 seconds on the first visit.
      </p>
      <button
        type="button"
        className="slow-load-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss notice"
      >
        ✕
      </button>
    </div>
  )
}
