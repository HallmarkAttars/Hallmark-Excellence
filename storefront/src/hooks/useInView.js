import { useEffect, useRef, useState } from 'react'

/**
 * useInView — IntersectionObserver hook
 *
 * @param {Object} options
 * @param {number}  options.threshold      — 0–1, how much of the element must be visible (default 0.1)
 * @param {string}  options.rootMargin     — CSS margin string (default '0px 0px -40px 0px')
 * @param {boolean} options.triggerOnce    — if true, observer disconnects after first intersection (default true)
 * @returns {[React.RefObject, boolean]}
 */
export default function useInView({
  threshold = 0.1,
  rootMargin = '0px 0px -40px 0px',
  triggerOnce = true,
} = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect reduced motion — instantly mark as in-view so animations become no-ops
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (triggerOnce) observer.unobserve(el)
        } else if (!triggerOnce) {
          setInView(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce])

  return [ref, inView]
}
