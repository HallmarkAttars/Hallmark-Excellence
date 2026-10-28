import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HERO } from '../../data/content'
import { IMAGES } from '../../config/assets'
import { buildHomeHeroImages } from '../../utils/homeHeroImages'
import './Hero.css'
import './CinematicHero.css'

const DEFAULT_DISPLAY_DURATION = 5500 // ~5.5s display before crossfade starts
const DEFAULT_FADE_DURATION = 1800 // 1.8s smooth crossfade
const MOTION_VARIANTS_COUNT = 6

/**
 * CinematicHero — Luxury perfume cinematic slideshow with Ken Burns camera movement
 * and continuous seamless brand image transitions.
 *
 * @param {Object} props
 * @param {Array<string|Object>} [props.images] - Dynamic image collection (strings or {src, mobileWebp, alt, focus, mobileFocus, brightness})
 * @param {number} [props.displayDuration=5500] - Display duration per slide in ms
 * @param {number} [props.fadeDuration=1800] - Crossfade transition duration in ms
 */
export default function CinematicHero({
  images,
  displayDuration = DEFAULT_DISPLAY_DURATION,
  fadeDuration = DEFAULT_FADE_DURATION,
}) {
  // Normalize images: supports raw URL strings, objects, or the curated fallback
  const slideList = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) {
      return images
        .map((item, index) => {
          if (!item) return null
          if (typeof item === 'string') {
            const isWebp = item.endsWith('.webp')
            return {
              src: item,
              webp: isWebp ? item : null,
              mobileWebp: index === 0 ? IMAGES.heroBackgroundMobile : null,
              alt:
                index === 0
                  ? 'Arees Perfumes — Hallmark luxury perfume and attar collection'
                  : `Luxury Perfume & Attar Collection ${index + 1}`,
              brandName: null,
            }
          }
          return {
            src: item.src || item.url || item.image || item.cover_image_url || '',
            webp: item.webp || (typeof item.src === 'string' && item.src.endsWith('.webp') ? item.src : null),
            mobileWebp: item.mobileWebp || (index === 0 ? IMAGES.heroBackgroundMobile : null),
            alt:
              item.alt ||
              (index === 0
                ? 'Arees Perfumes — Hallmark luxury perfume and attar collection'
                : 'Luxury Perfume & Attar Collection'),
            brandName: item.brandName || item.name || null,
            focus: item.focus || null,
            mobileFocus: item.mobileFocus || null,
            brightness: item.brightness ?? 1,
          }
        })
        .filter((img) => Boolean(img?.src))
    }

    // Defensive fallback: the same curated product rotation the homepage uses.
    return buildHomeHeroImages()
  }, [images])

  // Fallback safe slide
  const validSlides = slideList.length > 0 ? slideList : [
    {
      src: IMAGES.heroBackground,
      webp: IMAGES.heroBackgroundWebp,
      mobileWebp: IMAGES.heroBackgroundMobile,
      alt: 'Arees Perfumes — Hallmark luxury perfume and attar collection',
      brandName: 'Arees Perfumes',
      focus: '85% 40%',
      mobileFocus: '50% 42%',
      brightness: 1,
    },
  ]

  const totalSlides = validSlides.length

  // Slide state:
  // - activeSlide: currently visible slide (or newly incoming slide during transition)
  // - outgoingSlide: previous slide fading out underneath (during 1.8s crossfade)
  // - isTransitioning: true while crossfade is active
  const [activeSlide, setActiveSlide] = useState({
    index: 0,
    variant: 0,
    key: 'slide-0-0',
  })
  const [outgoingSlide, setOutgoingSlide] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const stepCounterRef = useRef(0)
  const timerRef = useRef(null)
  const fadeCleanupRef = useRef(null)

  // Preload upcoming images in the background after initial render settles
  useEffect(() => {
    if (totalSlides <= 1) return
    const nextIdx = (activeSlide.index + 1) % totalSlides
    const nextNextIdx = (activeSlide.index + 2) % totalSlides

    const isMobileViewport =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 767px)').matches

    const preload = (slide) => {
      if (!slide) return
      // On phones preload the portrait crop, matching the <source> the
      // browser will actually request.
      const targetSrc =
        (isMobileViewport && slide.mobileWebp) || slide.webp || slide.src
      if (targetSrc && typeof window !== 'undefined' && typeof Image !== 'undefined') {
        const img = new Image()
        img.src = targetSrc
      }
    }

    const timer = setTimeout(() => {
      preload(validSlides[nextIdx])
      if (totalSlides > 2) {
        preload(validSlides[nextNextIdx])
      }
    }, 2500)

    return () => clearTimeout(timer)
  }, [activeSlide.index, totalSlides, validSlides])

  // Clean up outgoing slide after crossfade completes (fadeDuration)
  useEffect(() => {
    if (!outgoingSlide) return
    const timer = setTimeout(() => {
      setOutgoingSlide(null)
      setIsTransitioning(false)
    }, fadeDuration)

    return () => clearTimeout(timer)
  }, [outgoingSlide, fadeDuration])

  // Schedule next slide transition after displayDuration
  useEffect(() => {
    if (totalSlides <= 1) return

    const timer = setTimeout(() => {
      stepCounterRef.current += 1
      const nextIndex = (activeSlide.index + 1) % totalSlides
      const nextVariant = (activeSlide.variant + 1) % MOTION_VARIANTS_COUNT
      const nextKey = `slide-${nextIndex}-${stepCounterRef.current}`

      setOutgoingSlide(activeSlide)
      setIsTransitioning(true)
      setActiveSlide({
        index: nextIndex,
        variant: nextVariant,
        key: nextKey,
      })
    }, displayDuration)

    return () => clearTimeout(timer)
  }, [activeSlide, displayDuration, totalSlides])

  // Render individual slide picture/img
  const renderSlideMedia = (slideIndex, isFirst = false) => {
    const slide = validSlides[slideIndex] || validSlides[0]
    const imageStyle = {
      '--hero-focus': slide.focus || 'center',
      '--hero-mobile-focus': slide.mobileFocus || slide.focus || 'center 38%',
      '--hero-image-brightness': slide.brightness ?? 1,
    }
    return (
      <picture className="hero-picture cinematic-hero-picture">
        {slide.mobileWebp && (
          <source media="(max-width: 767px)" type="image/webp" srcSet={slide.mobileWebp} />
        )}
        {slide.webp && <source type="image/webp" srcSet={slide.webp} />}
        <img
          src={slide.src}
          alt={slide.alt || 'Arees Perfumes — Hallmark luxury perfume and attar collection'}
          className="hero-img hero-bg cinematic-hero-img"
          style={imageStyle}
          fetchpriority={isFirst ? 'high' : 'auto'}
          decoding="async"
        />
      </picture>
    )
  }

  return (
    <section className="hero">
      {/* Background Image Layer: contains continuous cinematic brand slideshow */}
      <div className="hero-background-layer">
        {/* Outgoing slide: stays at full opacity underneath during crossfade while continuing its motion */}
        {outgoingSlide && (
          <div
            key={outgoingSlide.key}
            className="cinematic-hero-slide cinematic-hero-slide--outgoing"
            style={{ '--fade-duration': `${fadeDuration}ms` }}
          >
            <div
              className={`cinematic-hero-media cinematic-motion-${outgoingSlide.variant}`}
            >
              {renderSlideMedia(outgoingSlide.index)}
            </div>
          </div>
        )}

        {/* Active / Incoming slide */}
        <div
          key={activeSlide.key}
          className={`cinematic-hero-slide cinematic-hero-slide--active ${
            isTransitioning ? 'cinematic-hero-slide--incoming' : ''
          }`}
          style={{ '--fade-duration': `${fadeDuration}ms` }}
        >
          <div
            className={`cinematic-hero-media ${
              totalSlides > 1
                ? `cinematic-motion-${activeSlide.variant}`
                : 'cinematic-motion-single'
            }`}
          >
            {renderSlideMedia(activeSlide.index, activeSlide.index === 0 && !outgoingSlide)}
          </div>
        </div>
      </div>

      {/* Dark Cinematic Overlay: remains ABOVE images and BELOW text/buttons */}
      <div className="hero-overlay" aria-hidden="true" />

      {/* Existing Hero Content: fixed typography and buttons (do NOT move with background) */}
      <div className="hero-content">
        <h1 className="hero-title hero-reveal hero-reveal-1">
          {HERO.title.map((line, i) => (
            <span key={`${line}-${i}`}>
              {line}
              {i < HERO.title.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="hero-tagline hero-reveal hero-reveal-2">{HERO.subtitle}</p>
        <div className="hero-actions hero-reveal hero-reveal-3">
          <Link to={HERO.primaryCta.to} className="btn hero-btn hero-btn-primary">
            {HERO.primaryCta.label}
          </Link>
          <Link to={HERO.secondaryCta.to} className="btn btn-outline-light hero-btn">
            {HERO.secondaryCta.label}
            <span className="hero-btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
