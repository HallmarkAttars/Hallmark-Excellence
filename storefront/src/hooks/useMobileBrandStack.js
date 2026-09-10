import { useEffect } from 'react'

/**
 * useMobileBrandStack
 * 
 * Mobile-only (< 768px) scroll controller for the "Our Brands" section.
 * Delivers a clean, luxury, full-card scroll transition where ONE brand card
 * is the primary visible card at a time:
 * - Current brand card occupies the viewport below the header (~78px sticky top).
 * - Next brand card is held below the screen until the user has scrolled through
 *   the current card's showcase section.
 * - When the next card arrives, the current card smoothly recedes (scale 1.0 -> 0.94,
 *   translateY 0 -> -22px) and fades out completely (opacity 1.0 -> 0.0).
 * - Once the next card docks at sticky top, the previous card reaches opacity: 0 and
 *   pointer-events: none, so it is never visible behind the active card.
 * - Scrolling up reverses the transition smoothly and returns the previous card.
 * - Viewport-gated via IntersectionObserver with 0% scroll listening when outside.
 * - GPU-composited: writes CSS custom properties (--stack-scale, --stack-y, --stack-opacity).
 * - 100% disabled when viewport >= 768px or prefers-reduced-motion is active.
 */
export function useMobileBrandStack(containerRef) {
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    const isMobile = () => window.innerWidth < 768
    const prefersReducedMotion = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let isObserving = false
    let isTicking = false
    let cachedCards = []

    const cleanupStyles = () => {
      if (cachedCards && cachedCards.length > 0) {
        cachedCards.forEach((card) => {
          card.style.removeProperty('--stack-scale')
          card.style.removeProperty('--stack-y')
          card.style.removeProperty('--stack-opacity')
          card.style.removeProperty('pointer-events')
        })
      }
    }

    const updateStack = () => {
      if (!container || !isMobile() || prefersReducedMotion()) {
        cleanupStyles()
        return
      }

      cachedCards = Array.from(container.querySelectorAll('.brands-showcase-cell'))
      const n = cachedCards.length
      if (n <= 1) return

      // Mobile header baseline offset (~68px header + 10px breathing space)
      const stickyTop = 78

      // Pre-read bounding rects and heights in one pass to prevent layout thrashing
      const cardData = cachedCards.map((card) => {
        const rect = card.getBoundingClientRect()
        const height = card.offsetHeight || 520
        return { card, rect, height }
      })

      for (let i = 0; i < n; i++) {
        let scale = 1
        let y = 0
        let opacity = 1

        // For card i, check if incoming card (i + 1) is transitioning over it
        if (i < n - 1) {
          const nextCard = cardData[i + 1]
          // Transition window: starts when nextCard's top is approaching, ends when it docks at stickyTop
          const transitionSpan = Math.max(280, (nextCard.height || 520) * 0.85)
          const startTransition = stickyTop + transitionSpan
          const endTransition = stickyTop

          if (nextCard.rect.top < startTransition) {
            // nextCard is in transition or has fully docked/passed
            let p = (startTransition - nextCard.rect.top) / (startTransition - endTransition)
            p = Math.max(0, Math.min(1, p))

            scale = Math.max(0.92, 1 - p * 0.08)
            y = -(p * 22)
            // Fade out smoothly to 0 by the time p reaches 0.95
            opacity = Math.max(0, 1 - p * 1.05)
          }
        }

        // If covered by any subsequent cards (e.g. card i + 2 or later has arrived), ensure opacity is 0
        if (i < n - 2) {
          const laterCard = cardData[i + 2]
          if (laterCard.rect.top <= stickyTop + (laterCard.height * 0.6)) {
            opacity = 0
            scale = 0.92
            y = -22
          }
        }

        const targetEl = cardData[i].card
        targetEl.style.setProperty('--stack-scale', scale.toFixed(3))
        targetEl.style.setProperty('--stack-y', `${y.toFixed(1)}px`)
        targetEl.style.setProperty('--stack-opacity', opacity.toFixed(3))

        // When invisible, disable pointer events so clicks pass cleanly
        if (opacity <= 0.02) {
          targetEl.style.pointerEvents = 'none'
        } else {
          targetEl.style.removeProperty('pointer-events')
        }
      }
    }

    const onScroll = () => {
      if (!isTicking) {
        isTicking = true
        requestAnimationFrame(() => {
          updateStack()
          isTicking = false
        })
      }
    }

    let io = null
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry?.isIntersecting && isMobile() && !prefersReducedMotion()) {
            if (!isObserving) {
              window.addEventListener('scroll', onScroll, { passive: true })
              isObserving = true
              updateStack()
            }
          } else {
            if (isObserving) {
              window.removeEventListener('scroll', onScroll)
              isObserving = false
            }
          }
        },
        { rootMargin: '160px 0px 160px 0px' }
      )
      io.observe(container)
    } else {
      // Fallback if IntersectionObserver is not available
      window.addEventListener('scroll', onScroll, { passive: true })
      isObserving = true
      updateStack()
    }

    const onResize = () => {
      if (isMobile() && !prefersReducedMotion()) {
        updateStack()
      } else {
        cleanupStyles()
      }
    }
    window.addEventListener('resize', onResize, { passive: true })

    // Initial run
    updateStack()

    return () => {
      if (io) io.disconnect()
      if (isObserving) {
        window.removeEventListener('scroll', onScroll)
      }
      window.removeEventListener('resize', onResize)
      cleanupStyles()
    }
  }, [containerRef])
}
