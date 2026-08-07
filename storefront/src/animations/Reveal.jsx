import { useEffect, useRef } from 'react'

// Reusable scroll-reveal wrapper for the whole storefront — ONE system,
// used by every grid and section instead of duplicated per-page logic.
//
// - Fades content up (opacity + translateY) when it enters the viewport.
// - `delay` (ms) gives siblings a subtle stagger (cards, sections).
// - Fully progressive: content is only hidden behind the `.js` class that
//   index.html adds before first paint. Without JS, `.reveal` never hides
//   anything, so the site is 100% functional with animations disabled.
// - Elements already in view reveal immediately; no scroll listener ever.
// - prefers-reduced-motion is handled entirely in CSS (instant reveal).
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const show = () => el.classList.add('is-visible')

    // Fallback for very old browsers / non-browser environments.
    if (typeof IntersectionObserver === 'undefined') {
      show()
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show()
            io.unobserve(entry.target)
          }
        })
      },
      // Trigger slightly early so cards begin to rise just before they are
      // fully inside the viewport — never after the user has passed them.
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
