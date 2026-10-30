import { useEffect, useState } from 'react'
import './BackToTop.css'

// Floating back-to-top button — rendered ONCE in the storefront root (App.jsx).
// It only appears after the user has scrolled passed a threshold, so short
// pages (Contact, 404, …) never show it. The scroll listener is passive and
// the handler is throttled by React's state dedup — no rAF needed at this
// frequency (one boolean flip per direction change).
const SCROLL_THRESHOLD = 600

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  const scrollTop = () => {
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      className="back-to-top"
      onClick={scrollTop}
      aria-label="Back to top"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  )
}
