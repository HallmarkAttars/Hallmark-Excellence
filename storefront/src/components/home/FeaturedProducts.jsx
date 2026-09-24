import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Reveal from '../../animations/Reveal'
import { cloudinarySrc } from '../../utils/productImage'
import { displayProductName } from '../../utils/productName'
import { isProductInStock } from '../../utils/stock'
import QuickView from '../product/QuickView'
import { HOME_FEATURED } from '../../data/content'
import './FeaturedProducts.css'

// Fallback image in case a product image is unavailable
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23F0E7D8'/%3E%3Ctext x='400' y='340' font-family='Georgia, serif' font-size='110' fill='%23B88938' text-anchor='middle'%3EA%26D%3C/text%3E%3C/svg%3E"

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export default function FeaturedProducts({ products }) {
  const navigate = useNavigate()
  const rawItems = products || []

  // If there are zero featured products, do not render the section
  if (rawItems.length === 0) return null

  // Homepage focuses on up to 6 featured products
  const uniqueItems = useMemo(() => rawItems.slice(0, 6), [rawItems])

  // Orbital slots: we create at least 6 balanced orbital positions
  const slots = useMemo(() => {
    if (uniqueItems.length === 0) return []
    if (uniqueItems.length >= 5) {
      return uniqueItems.map((p, idx) => ({
        product: p,
        slotIndex: idx,
        originalIndex: idx,
        key: `orbit-slot-${p.id}-${idx}`,
      }))
    }
    // Repeat to create 6 balanced slots if fewer than 5 items
    const target = 6
    const res = []
    for (let i = 0; i < target; i++) {
      const orig = i % uniqueItems.length
      res.push({
        product: uniqueItems[orig],
        slotIndex: i,
        originalIndex: orig,
        key: `orbit-slot-${uniqueItems[orig].id}-${i}`,
      })
    }
    return res
  }, [uniqueItems])

  const totalSlots = slots.length
  const angleStep = totalSlots > 0 ? (2 * Math.PI) / totalSlots : 0

  // Interactive states
  const [activeSlot, setActiveSlot] = useState(0)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [radii, setRadii] = useState({ rx: 360, ry: 75, minScale: 0.68, minOpacity: 0.65 })

  // Refs for animation without triggering React re-renders on every frame
  const stageRef = useRef(null)
  const itemRefs = useRef([])
  const currentAngleRef = useRef(0)
  const targetAngleRef = useRef(0)
  const isTargetingRef = useRef(false)
  const isHoveredRef = useRef(false)
  const isDraggingRef = useRef(false)
  const activeSlotRef = useRef(0)
  const reducedMotionRef = useRef(false)
  const touchStartXRef = useRef(0)
  const touchCurrentXRef = useRef(0)

  // Measure container and adapt orbit radii dynamically across all screen sizes
  const updateResponsiveRadii = useCallback(() => {
    if (!stageRef.current) return
    const width = stageRef.current.clientWidth
    if (width >= 1200) {
      setRadii({ rx: 380, ry: 78, minScale: 0.70, minOpacity: 0.65 })
    } else if (width >= 992) {
      setRadii({ rx: 320, ry: 66, minScale: 0.66, minOpacity: 0.62 })
    } else if (width >= 768) {
      setRadii({ rx: 250, ry: 52, minScale: 0.62, minOpacity: 0.60 })
    } else if (width >= 480) {
      const rx = Math.min(170, (width - 70) / 2)
      setRadii({ rx, ry: 38, minScale: 0.58, minOpacity: 0.56 })
    } else {
      // 375px - 414px mobile: tight, beautiful, perfectly centered
      const rx = Math.min(136, (width - 56) / 2)
      setRadii({ rx, ry: 30, minScale: 0.54, minOpacity: 0.52 })
    }
  }, [])

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = Boolean(mq?.matches)
    const listener = (e) => {
      reducedMotionRef.current = Boolean(e.matches)
    }
    mq?.addEventListener?.('change', listener)
    return () => mq?.removeEventListener?.('change', listener)
  }, [])

  // Resize listener
  useEffect(() => {
    updateResponsiveRadii()
    window.addEventListener('resize', updateResponsiveRadii)
    return () => window.removeEventListener('resize', updateResponsiveRadii)
  }, [updateResponsiveRadii])

  // Direct DOM transform updater for buttery 60/120fps performance
  const applyTransforms = useCallback(
    (angle) => {
      if (totalSlots === 0) return
      const { rx, ry, minScale, minOpacity } = radii

      let maxCos = -2
      let closestSlot = 0

      for (let i = 0; i < totalSlots; i++) {
        const itemAngle = angle + i * angleStep
        const x = rx * Math.sin(itemAngle)
        const y = ry * Math.cos(itemAngle) // cos=1 at front (y = +ry, down closer to customer)
        const cosVal = Math.cos(itemAngle)
        const zNorm = (cosVal + 1) / 2 // 1 at front, 0 at back

        if (cosVal > maxCos) {
          maxCos = cosVal
          closestSlot = i
        }

        const scale = minScale + (1.0 - minScale) * zNorm
        const opacity = minOpacity + (1.0 - minOpacity) * zNorm
        const zIndex = Math.round(10 + 90 * zNorm)
        const blur = (1 - zNorm) * 1.5

        const el = itemRefs.current[i]
        if (el) {
          // IMPORTANT: Upright bottle orientation! Translate and scale only — NEVER rotate image!
          el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) scale(${scale.toFixed(3)})`
          el.style.opacity = opacity.toFixed(2)
          el.style.zIndex = zIndex
          el.style.filter = blur > 0.25 ? `blur(${blur.toFixed(1)}px)` : 'none'
          el.setAttribute('data-is-front', zNorm > 0.88 ? 'true' : 'false')
        }
      }

      // Update state only when the active front product changes
      if (closestSlot !== activeSlotRef.current) {
        activeSlotRef.current = closestSlot
        setActiveSlot(closestSlot)
      }
    },
    [totalSlots, angleStep, radii]
  )

  // Continuous animation loop via requestAnimationFrame
  useEffect(() => {
    let animId
    let lastTime = performance.now()

    const tick = (now) => {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now

      if (isTargetingRef.current) {
        const diff = targetAngleRef.current - currentAngleRef.current
        if (Math.abs(diff) < 0.001) {
          currentAngleRef.current = targetAngleRef.current
          isTargetingRef.current = false
        } else {
          // Smooth luxury spring ease towards target angle
          currentAngleRef.current += diff * 0.08
        }
      } else if (
        !isHoveredRef.current &&
        !isDraggingRef.current &&
        !reducedMotionRef.current
      ) {
        // Continuous, slow, cinematic orbital drift (~18s full 360° revolution)
        // 2*Math.PI / 18000ms ~= 0.000349 rad/ms
        currentAngleRef.current += 0.000349 * dt
      }

      applyTransforms(currentAngleRef.current)
      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [applyTransforms])

  // Navigation handlers
  const rotateNext = useCallback(() => {
    isTargetingRef.current = true
    targetAngleRef.current = currentAngleRef.current - angleStep
  }, [angleStep])

  const rotatePrev = useCallback(() => {
    isTargetingRef.current = true
    targetAngleRef.current = currentAngleRef.current + angleStep
  }, [angleStep])

  const rotateToSlot = useCallback(
    (targetSlotIndex) => {
      if (totalSlots === 0) return
      // We want: targetAngle + targetSlotIndex * angleStep == 0 (mod 2pi)
      // So targetAngle == -targetSlotIndex * angleStep (mod 2pi)
      const current = currentAngleRef.current
      const desiredBase = -targetSlotIndex * angleStep
      // Find the nearest multiple of 2pi to keep movement shortest
      const twoPi = 2 * Math.PI
      let diff = (desiredBase - current) % twoPi
      if (diff > Math.PI) diff -= twoPi
      if (diff < -Math.PI) diff += twoPi

      targetAngleRef.current = current + diff
      isTargetingRef.current = true
    },
    [totalSlots, angleStep]
  )

  const rotateToOriginalIndex = useCallback(
    (originalIdx) => {
      // Find first slot corresponding to this original item
      const slot = slots.find((s) => s.originalIndex === originalIdx)
      if (slot) {
        rotateToSlot(slot.slotIndex)
      }
    },
    [slots, rotateToSlot]
  )

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
    const swipeThreshold = 35
    if (deltaX < -swipeThreshold) {
      rotateNext()
    } else if (deltaX > swipeThreshold) {
      rotatePrev()
    }
  }

  const activeItem = slots[activeSlot]?.product || uniqueItems[0]
  const activeOriginalIndex = slots[activeSlot]?.originalIndex ?? 0
  const isInStock = activeItem ? isProductInStock(activeItem) : true

  return (
    <Reveal as="section" className="section featured-orbit-section">
      <div className="container">
        {/* Section Header */}
        <div className="featured-orbit-head">
          <p className="featured-orbit-eyebrow">
            <span className="eyebrow-sparkle" aria-hidden="true">✦</span>
            <span>{HOME_FEATURED.title ? HOME_FEATURED.title.toUpperCase() : 'FEATURED PRODUCTS'}</span>
            <span className="eyebrow-sparkle" aria-hidden="true">✦</span>
          </p>
          <h2 className="featured-orbit-title">
            Scents, made by hand — oud, rose and amber from our atelier.
          </h2>
          {HOME_FEATURED.viewAll && (
            <Link to={HOME_FEATURED.viewAll.to} className="featured-orbit-view-all">
              <span>{HOME_FEATURED.viewAll.label}</span>
              <span className="view-all-arrow" aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        {/* Orbit Stage — mouse hover pauses auto-rotation */}
        <div
          className="featured-orbit-stage"
          ref={stageRef}
          onMouseEnter={() => {
            isHoveredRef.current = true
          }}
          onMouseLeave={() => {
            isHoveredRef.current = false
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label="Interactive 3D fragrance showcase"
        >
          {/* Subtle Ambient Gold Lighting & Glow */}
          <div className="featured-orbit-ambient-glow" aria-hidden="true" />

          {/* Luxury Illuminated Circular / Elliptical Platform */}
          <div className="featured-orbit-platform" aria-hidden="true">
            <div className="platform-glow-ring" />
            <div className="platform-glass-surface" />
            <div className="platform-pedestal-light" />
          </div>

          {/* Navigation Arrows — Elegant Gold Buttons */}
          <button
            type="button"
            className="featured-orbit-nav-btn is-prev"
            onClick={rotatePrev}
            aria-label="Previous fragrance"
          >
            <ArrowLeftIcon />
          </button>
          <button
            type="button"
            className="featured-orbit-nav-btn is-next"
            onClick={rotateNext}
            aria-label="Next fragrance"
          >
            <ArrowRightIcon />
          </button>

          {/* Orbiting Product Items — Upright Bottles moving along elliptical track */}
          <div className="featured-orbit-track" role="region" aria-live="polite">
            {slots.map((slot, index) => {
              const { product } = slot
              const isFront = index === activeSlot
              const imgSrc = cloudinarySrc(product.image, { width: 500 })

              return (
                <div
                  key={slot.key}
                  ref={(el) => (itemRefs.current[index] = el)}
                  className={`featured-orbit-item ${isFront ? 'is-front' : ''}`}
                  onClick={() => {
                    if (isFront) {
                      navigate(`/product/${product.id}`)
                    } else {
                      rotateToSlot(index)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${product.name} ${isFront ? '(Featured in center)' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (isFront) {
                        navigate(`/product/${product.id}`)
                      } else {
                        rotateToSlot(index)
                      }
                    }
                  }}
                >
                  <div className="orbit-item-card">
                    {/* Shadow directly beneath the perfume bottle */}
                    <div className="orbit-item-ground-shadow" aria-hidden="true" />

                    {/* Bottle Image — Remains strictly upright! */}
                    <div className="orbit-item-bottle-wrap">
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="orbit-item-image"
                        loading={index < 3 ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = PLACEHOLDER_IMG
                        }}
                      />
                    </div>

                    {/* Status Badge */}
                    {product.is_featured && isFront && (
                      <span className="orbit-item-badge">Featured</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center Product Details — Smoothly crossfading underneath */}
        {activeItem && (
          <div className="featured-orbit-details">
            <div className="orbit-details-card" key={activeItem.id}>
              <p className="orbit-details-brand">
                {activeItem.brand_name || activeItem.category_name || 'AREES ATELIER'}
              </p>
              <h3 className="orbit-details-title">
                <Link to={`/product/${activeItem.id}`}>
                  {displayProductName(activeItem.name)}
                </Link>
              </h3>
              <p className="orbit-details-category">
                {activeItem.category_name || 'Roll On Perfume & Concentrated Oil'}
                {!isInStock && <span className="orbit-details-stock is-soldout"> · Out of Stock</span>}
              </p>

              {/* Action Buttons */}
              <div className="orbit-details-actions">
                <Link to={`/product/${activeItem.id}`} className="orbit-cta-btn">
                  <span>Explore Fragrance</span>
                  <span className="cta-arrow" aria-hidden="true">→</span>
                </Link>
                <button
                  type="button"
                  className="orbit-quickview-btn"
                  onClick={() => setQuickViewProduct(activeItem)}
                  aria-label={`Quick view ${activeItem.name}`}
                >
                  <EyeIcon />
                  <span>Quick View</span>
                </button>
              </div>
            </div>

            {/* Dot Indicators */}
            <div
              className="featured-orbit-dots"
              role="tablist"
              aria-label="Select featured fragrance"
            >
              {uniqueItems.map((p, dotIdx) => {
                const isActive = dotIdx === activeOriginalIndex
                return (
                  <button
                    key={`orbit-dot-${p.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`View fragrance ${dotIdx + 1}: ${p.name}`}
                    className={`orbit-dot ${isActive ? 'is-active' : ''}`}
                    onClick={() => rotateToOriginalIndex(dotIdx)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* QuickView Modal */}
        {quickViewProduct && (
          <QuickView
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
          />
        )}

        {/* Subtle Luxury Section Divider */}
        <div className="featured-section-divider" aria-hidden="true">
          <span className="featured-divider-line" />
        </div>
      </div>
    </Reveal>
  )
}
