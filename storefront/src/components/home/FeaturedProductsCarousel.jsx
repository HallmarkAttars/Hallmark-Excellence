import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cloudinarySrc } from '../../utils/productImage'
import { displayProductName } from '../../utils/productName'
import './FeaturedProductsCarousel.css'

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23F0E7D8'/%3E%3Ctext x='400' y='340' font-family='Georgia, serif' font-size='110' fill='%23B88938' text-anchor='middle'%3EA%26D%3C/text%3E%3C/svg%3E"

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

/**
 * Reusable FeaturedProductsCarousel Component
 *
 * Implements ONE single continuous mathematical circular/elliptical orbit where
 * ALL featured products participate.
 *
 * - No separate slides or pages
 * - No slicing or artificial limit to 5/6 products
 * - No duplicate cloned items
 * - True infinite mathematical rotation without last-to-first visual reset
 * - Bottles stay 100% vertically upright (translate3d and scale only, no bottle rotation)
 * - Center product comes forward (scale ~1.20, opacity 1.0, blur 0, highest z-index)
 * - Surrounding products curve around the dais with dynamic depth
 */
export default function FeaturedProductsCarousel({
  products = [],
  rotationDuration = 22, // 22 seconds for one complete 360-degree orbit
  onProductClick,
}) {
  const navigate = useNavigate()

  // ALL featured products are included — no slicing, no artificial capping!
  const featuredList = useMemo(() => {
    return Array.isArray(products) ? products : []
  }, [products])

  const totalProducts = featuredList.length
  // Angular step between adjacent products around the circular orbit (2*PI / N)
  const angleStep = totalProducts > 0 ? (2 * Math.PI) / totalProducts : 0

  // Rotation speed in radians per millisecond: 2*PI / (duration * 1000)
  const rotationSpeed = useMemo(() => {
    return (2 * Math.PI) / (Math.max(12, rotationDuration) * 1000)
  }, [rotationDuration])

  // Active product index (which product is currently closest to front-center)
  const [activeProductIndex, setActiveProductIndex] = useState(0)
  const [radii, setRadii] = useState({ rx: 420, ry: 85, minScale: 0.60, maxScale: 1.20 })

  // Refs for 60/120fps continuous animation without triggering React re-renders on every frame
  const stageRef = useRef(null)
  const itemRefs = useRef([])
  const baseAngleRef = useRef(0)
  const targetAngleRef = useRef(0)
  const isManualRef = useRef(false)
  const isHoveredRef = useRef(false)
  const isDraggingRef = useRef(false)
  const activeIndexRef = useRef(0)
  const reducedMotionRef = useRef(false)
  const touchStartXRef = useRef(0)
  const touchCurrentXRef = useRef(0)

  // Dynamic responsive orbit radius calculation according to viewport width
  const updateResponsiveRadii = useCallback(() => {
    if (!stageRef.current) return
    const width = stageRef.current.clientWidth
    if (width >= 1200) {
      setRadii({ rx: 430, ry: 88, minScale: 0.62, maxScale: 1.22 })
    } else if (width >= 992) {
      setRadii({ rx: 360, ry: 74, minScale: 0.60, maxScale: 1.18 })
    } else if (width >= 768) {
      setRadii({ rx: 280, ry: 58, minScale: 0.58, maxScale: 1.15 })
    } else if (width >= 480) {
      const rx = Math.min(185, (width - 70) / 2)
      setRadii({ rx, ry: 40, minScale: 0.54, maxScale: 1.12 })
    } else {
      // 375px - 414px mobile: perfectly centered, zero horizontal overflow
      const rx = Math.min(142, (width - 50) / 2)
      setRadii({ rx, ry: 32, minScale: 0.50, maxScale: 1.10 })
    }
  }, [])

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = Boolean(mq?.matches)
    const handler = (e) => {
      reducedMotionRef.current = Boolean(e.matches)
    }
    mq?.addEventListener?.('change', handler)
    return () => mq?.removeEventListener?.('change', handler)
  }, [])

  // Resize listener
  useEffect(() => {
    updateResponsiveRadii()
    window.addEventListener('resize', updateResponsiveRadii)
    return () => window.removeEventListener('resize', updateResponsiveRadii)
  }, [updateResponsiveRadii])

  // Pause when browser tab is inactive to preserve performance
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        isHoveredRef.current = true
      } else {
        isHoveredRef.current = false
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Mathematical positioning for all products along the single elliptical orbit
  const applyTransforms = useCallback(
    (currentAngle) => {
      if (totalProducts === 0) return
      const { rx, ry, minScale, maxScale } = radii

      let maxCos = -2
      let closestIdx = 0

      for (let i = 0; i < totalProducts; i++) {
        // Continuous angular position for product i:
        // angle_i = currentAngle + i * (2*PI / N)
        const itemAngle = currentAngle + i * angleStep
        const sinVal = Math.sin(itemAngle)
        const cosVal = Math.cos(itemAngle) // cos=1 at front-center, cos=-1 at back-center

        // Coordinates on the 3D ellipse
        const x = rx * sinVal
        const y = ry * cosVal

        // Depth value in [0, 1]: 1 at front-center, 0 at back-center
        const depth = (cosVal + 1) / 2

        if (cosVal > maxCos) {
          maxCos = cosVal
          closestIdx = i
        }

        // Scale, opacity, z-index, and depth blur derived from depth
        const scale = minScale + (maxScale - minScale) * Math.pow(depth, 1.2)

        // Opacity curve: front items 100%, sides 80-90%, back items smoothly soften
        let opacity = 0.55 + 0.45 * depth
        if (totalProducts > 8 && depth < 0.25) {
          // For larger product collections (10, 15, 20+), gently soften the rear arc
          // so deep background bottles do not create visual clutter directly behind center
          opacity = Math.max(0.12, depth * 2.2)
        }

        const zIndex = Math.round(10 + 90 * depth)
        const blur = (1 - depth) * 1.8
        const isFront = depth > 0.88

        const el = itemRefs.current[i]
        if (el) {
          // STRICTLY UPRIGHT BOTTLES: translate3d and scale ONLY — NEVER rotate the bottle/box!
          el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) scale(${scale.toFixed(3)})`
          el.style.opacity = opacity.toFixed(2)
          el.style.zIndex = zIndex
          el.style.filter = blur > 0.35 ? `blur(${blur.toFixed(1)}px)` : 'none'
          el.classList.toggle('is-active-front', isFront)
        }
      }

      // Update state only when the active front product changes
      if (closestIdx !== activeIndexRef.current) {
        activeIndexRef.current = closestIdx
        setActiveProductIndex(closestIdx)
      }
    },
    [totalProducts, angleStep, radii]
  )

  // Continuous animation loop via requestAnimationFrame
  useEffect(() => {
    let animId
    let lastTime = performance.now()

    const tick = (now) => {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now

      if (isManualRef.current) {
        // Smooth luxury spring interpolation towards target product
        const diff = targetAngleRef.current - baseAngleRef.current
        if (Math.abs(diff) < 0.0008) {
          baseAngleRef.current = targetAngleRef.current
          isManualRef.current = false
        } else {
          baseAngleRef.current += diff * 0.08
        }
      } else if (
        !isHoveredRef.current &&
        !isDraggingRef.current &&
        !reducedMotionRef.current
      ) {
        // Continuous, smooth, slow circular orbit rotation:
        // angle decreases continuously so products travel around the ellipse
        baseAngleRef.current -= rotationSpeed * dt
        targetAngleRef.current = baseAngleRef.current
      }

      applyTransforms(baseAngleRef.current)
      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [applyTransforms, rotationSpeed])

  // Step Next (advance orbit by 1 product position)
  const handleNext = useCallback(() => {
    isManualRef.current = true
    targetAngleRef.current = baseAngleRef.current - angleStep
  }, [angleStep])

  // Step Prev (retreat orbit by 1 product position)
  const handlePrev = useCallback(() => {
    isManualRef.current = true
    targetAngleRef.current = baseAngleRef.current + angleStep
  }, [angleStep])

  // Smoothly rotate to a specific product index (for pagination dots or clicking an item)
  const rotateToProductIndex = useCallback(
    (productIdx) => {
      if (totalProducts === 0) return
      // We want: baseAngle + productIdx * angleStep = 0 (mod 2*PI)
      // So desired angle = -productIdx * angleStep (mod 2*PI)
      const current = baseAngleRef.current
      const desired = -productIdx * angleStep
      const twoPi = 2 * Math.PI
      let diff = (desired - current) % twoPi
      if (diff > Math.PI) diff -= twoPi
      if (diff < -Math.PI) diff += twoPi

      targetAngleRef.current = current + diff
      isManualRef.current = true
    },
    [totalProducts, angleStep]
  )

  // Clicking an orbiting product:
  // - If it is currently front-center: navigates to /product/:id
  // - If it is on the side or back: smoothly rotates it to the front-center!
  const handleProductCardClick = (product, index, isFront) => {
    if (isFront) {
      if (onProductClick) {
        onProductClick(product)
      } else {
        navigate(`/product/${product.id}`)
      }
    } else {
      rotateToProductIndex(index)
    }
  }

  // Touch gesture listeners for mobile swipe
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX
    touchCurrentXRef.current = e.touches[0].clientX
    isDraggingRef.current = true
  }

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return
    touchCurrentXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const deltaX = touchCurrentXRef.current - touchStartXRef.current
    if (deltaX < -35) {
      handleNext()
    } else if (deltaX > 35) {
      handlePrev()
    }
  }

  if (totalProducts === 0) return null

  return (
    <div
      className="carousel-orbit-wrapper"
      onMouseEnter={() => {
        isHoveredRef.current = true
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Continuous 3D circular fragrance orbit"
    >
      {/* 3D Orbit Stage */}
      <div className="carousel-orbit-stage" ref={stageRef}>
        {/* Ambient Warm Golden Aura */}
        <div className="carousel-ambient-backlight" aria-hidden="true" />

        {/* Illuminated 3D Luxury Pedestal Platform Dais */}
        <div className="carousel-pedestal-platform" aria-hidden="true">
          {/* Glowing Double-Gold Beveled Edge */}
          <div className="platform-rim-outer" />
          <div className="platform-rim-inner" />

          {/* Polished Marble Floor with Specular Reflection */}
          <div className="platform-surface-marble">
            {/* Luminous Orbital Light Trails etched on Platform */}
            <svg
              className="platform-light-trails"
              viewBox="0 0 1000 400"
              preserveAspectRatio="none"
            >
              <ellipse
                cx="500"
                cy="200"
                rx="450"
                ry="170"
                fill="none"
                stroke="url(#orbitGoldGrad)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                opacity="0.65"
              />
              <ellipse
                cx="500"
                cy="200"
                rx="360"
                ry="130"
                fill="none"
                stroke="rgba(212, 175, 55, 0.45)"
                strokeWidth="1.2"
                strokeDasharray="12 8"
                opacity="0.5"
              />
              <defs>
                <linearGradient id="orbitGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(212, 175, 55, 0.1)" />
                  <stop offset="50%" stopColor="rgba(255, 235, 175, 0.75)" />
                  <stop offset="100%" stopColor="rgba(212, 175, 55, 0.1)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="platform-center-spotlight" />
          </div>
        </div>

        {/* Navigation Arrow: Previous */}
        <button
          type="button"
          className="carousel-nav-arrow is-left"
          onClick={handlePrev}
          aria-label="Previous fragrance"
        >
          <ChevronLeft />
        </button>

        {/* Navigation Arrow: Next */}
        <button
          type="button"
          className="carousel-nav-arrow is-right"
          onClick={handleNext}
          aria-label="Next fragrance"
        >
          <ChevronRight />
        </button>

        {/* Orbiting Product Items — ALL featured products on ONE single continuous orbit! */}
        <div className="carousel-orbit-track" role="region" aria-live="polite">
          {featuredList.map((product, index) => {
            const isFront = index === activeProductIndex
            const imgSrc = cloudinarySrc(product.image, { width: 450 })

            return (
              <div
                key={`orbit-prod-${product.id}`}
                ref={(el) => (itemRefs.current[index] = el)}
                className="carousel-orbit-item"
                onClick={() => handleProductCardClick(product, index, isFront)}
                role="button"
                tabIndex={0}
                aria-label={`${product.name} ${isFront ? '(Current featured selection)' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleProductCardClick(product, index, isFront)
                  }
                }}
              >
                <div className="carousel-item-pedestal-card">
                  {/* Physical bottle contact ground shadow */}
                  <div className="carousel-bottle-shadow" aria-hidden="true" />

                  {/* Bottle / Box Container — strictly upright! */}
                  <div className="carousel-bottle-container">
                    <img
                      src={imgSrc}
                      alt={product.name}
                      className="carousel-bottle-img"
                      loading={index < 5 ? 'eager' : 'lazy'}
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = PLACEHOLDER_IMG
                      }}
                    />
                  </div>

                  {/* Product Title and Category printed directly below bottle on the platform */}
                  <div className="carousel-item-info">
                    <h4 className="carousel-item-name">{displayProductName(product.name)}</h4>
                    <p className="carousel-item-category">
                      {product.category_name || 'Roll On Perfume'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pagination Dots (Exactly matches total featured products count) */}
      {totalProducts > 1 && (
        <div className="carousel-pagination-dots" role="tablist" aria-label="Featured fragrance dots">
          {featuredList.map((product, dotIdx) => {
            const isActive = dotIdx === activeProductIndex
            return (
              <button
                key={`carousel-dot-${product.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Select fragrance ${dotIdx + 1}: ${product.name}`}
                className={`carousel-dot ${isActive ? 'is-active' : ''}`}
                onClick={() => rotateToProductIndex(dotIdx)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
