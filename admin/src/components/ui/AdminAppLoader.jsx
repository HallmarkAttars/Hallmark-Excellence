import { useState, useEffect, useRef } from 'react'
import './AdminAppLoader.css'

const ROTATING_MESSAGES = [
  'Preparing your admin workspace...',
  'Loading dashboard...',
  'Preparing your workspace...',
  'Loading products...',
  'Almost ready...',
]

// Pure CSS decorative petals — lightweight SVG paths
function AmbientPetal({ className, style }) {
  return (
    <span className={`admin-loader-petal ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C12 2 15 7 15 12C15 17 12 22 12 22C12 22 9 17 9 12C9 7 12 2 12 2Z" />
      </svg>
    </span>
  )
}

export default function AdminAppLoader({
  isReady = false,
  error = null,
  onFadeComplete,
}) {
  const [statusIndex, setStatusIndex] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const fadeTimerRef = useRef(null)

  // Rotating professional status messages
  useEffect(() => {
    if (fadingOut || error || hasTimedOut) return
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [fadingOut, error, hasTimedOut])

  // Safety fallback: if initialization stalls for > 12s, show graceful error recovery
  useEffect(() => {
    if (isReady || fadingOut) return
    const timeout = setTimeout(() => {
      setHasTimedOut(true)
    }, 12000)
    return () => clearTimeout(timeout)
  }, [isReady, fadingOut])

  // Smooth fade-out sequence when ready
  useEffect(() => {
    if (isReady && !error && !hasTimedOut) {
      setFadingOut(true)
      fadeTimerRef.current = setTimeout(() => {
        setMounted(false)
        if (onFadeComplete) onFadeComplete()
      }, 600) // matches 550ms CSS fade-out transition
    }
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [isReady, error, hasTimedOut, onFadeComplete])

  if (!mounted) return null

  const displayError = error || (hasTimedOut ? 'Initialization timeout' : null)

  return (
    <div
      className={`admin-loader-overlay ${fadingOut ? 'admin-loader--fading-out' : ''}`}
      role={displayError ? 'alert' : 'status'}
      aria-busy={!displayError && !fadingOut}
      aria-live="polite"
    >
      {/* Background Architectural & Fragrance Ambience */}
      <div className="admin-loader-ambient" aria-hidden="true">
        {/* Soft centered cinematic lighting glow */}
        <div className="admin-loader-light-spotlight" />

        {/* Subtle Arabian Architectural Arch */}
        <svg
          className="admin-loader-arch"
          viewBox="0 0 500 700"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="archGoldMain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C6A15B" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#D4B36D" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#C6A15B" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#C6A15B" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="archGoldInner" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E2CA8E" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#C6A15B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#C6A15B" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="archIllumination" cx="50%" cy="38%" r="48%">
              <stop offset="0%" stopColor="#C6A15B" stopOpacity="0.09" />
              <stop offset="60%" stopColor="#C6A15B" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#C6A15B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Soft inner arch ambient fill */}
          <path
            d="M 60,700 V 380 C 60,230 180,120 250,50 C 320,120 440,230 440,380 V 700 Z"
            fill="url(#archIllumination)"
          />

          {/* Outer dashed arch line */}
          <path
            d="M 50,700 V 380 C 50,220 170,110 250,40 C 330,110 450,220 450,380 V 700"
            stroke="url(#archGoldMain)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />

          {/* Primary pointed architectural contour */}
          <path
            d="M 75,700 V 390 C 75,245 185,145 250,75 C 315,145 425,245 425,390 V 700"
            stroke="url(#archGoldInner)"
            strokeWidth="1.5"
          />

          {/* Delicate inner trim */}
          <path
            d="M 95,700 V 400 C 95,270 195,175 250,110 C 305,175 405,270 405,400 V 700"
            stroke="url(#archGoldMain)"
            strokeWidth="0.8"
            opacity="0.75"
          />

          {/* Arch apex finial */}
          <path
            d="M 250,28 L 255,40 L 250,52 L 245,40 Z"
            fill="#C6A15B"
            opacity="0.8"
          />
          <circle cx="250" cy="20" r="2.5" fill="#D4B36D" opacity="0.85" />
        </svg>

        {/* Ambient subtle floating golden dust motes */}
        <span className="admin-loader-mote mote-1" />
        <span className="admin-loader-mote mote-2" />
        <span className="admin-loader-mote mote-3" />
        <span className="admin-loader-mote mote-4" />

        {/* Subtle fragrance petal silhouettes */}
        <AmbientPetal className="petal-1" style={{ left: '18%', animationDelay: '0s' }} />
        <AmbientPetal className="petal-2" style={{ right: '22%', animationDelay: '2.5s' }} />
        <AmbientPetal className="petal-3" style={{ left: '28%', animationDelay: '4.8s' }} />
      </div>

      {/* Main Center Content */}
      <div className="admin-loader-center">
        {displayError ? (
          /* Error State: Prevents user from being stuck indefinitely */
          <div className="admin-loader-error-card">
            <div className="admin-loader-error-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="admin-loader-error-title">Something went wrong</h2>
            <p className="admin-loader-error-desc">
              We encountered an unexpected error loading this page.
            </p>
            <button
              type="button"
              className="btn btn-gold admin-loader-reload-btn"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        ) : (
          /* Standard Luxury Cinematic Loader State */
          <>
            {/* Arees Emblem with Breathing Halo & Shimmer */}
            <div className="admin-loader-brand">
              <div className="admin-loader-halo" aria-hidden="true" />
              <div className="admin-loader-logo-container">
                <img
                  src="/HE color Logo.png"
                  alt="Arees Perfumes of Excellence"
                  className="admin-loader-logo"
                  width="180"
                  height="58"
                />
                <div className="admin-loader-shimmer-sweep" aria-hidden="true" />
              </div>

              {/* Subtitle Typography */}
              <div className="admin-loader-subtitle">PERFUMES OF EXCELLENCE</div>
            </div>

            {/* Luxury Divider: ────────────◆──────────── */}
            <div className="admin-loader-divider" aria-hidden="true">
              <span className="admin-loader-divider-line" />
              <span className="admin-loader-divider-diamond">◆</span>
              <span className="admin-loader-divider-line" />
            </div>

            {/* Continuous Smooth Champagne Gold Progress Track */}
            <div className="admin-loader-progress-wrap" aria-hidden="true">
              <div className="admin-loader-progress-track">
                <div className="admin-loader-progress-beam" />
              </div>
            </div>

            {/* Professional Rotating Loading Text */}
            <div className="admin-loader-text-wrap">
              <p key={statusIndex} className="admin-loader-text">
                {ROTATING_MESSAGES[statusIndex]}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Re-export alias for page-level usage
export const AdminPageLoader = AdminAppLoader
