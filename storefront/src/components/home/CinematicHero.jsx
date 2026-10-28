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
const MOBILE_MEDIA = '(max-width: 767px)'

const fallbackAlt = 'Arees Perfumes — Hallmark luxury perfume and attar collection'

/**
 * CinematicHero — Luxury perfume cinematic slideshow with Ken Burns camera
 * movement and continuous seamless brand image transitions.
 *
 * Two slide layouts are supported:
 * - photo: the classic full-bleed image
 * - showcase: a framed, uncropped artwork over a blurred copy of the same
 *   image, used for catalogue graphics that contain their own logo and text.
 *
 * @param {Object} props
 * @param {Array<string|Object>} [props.images] - Dynamic image collection
 * @param {number} [props.displayDuration=5500] - Default display duration per slide
 * @param {number} [props.fadeDuration=1800] - Crossfade transition duration
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
              layout: 'photo',
              src: item,
              webp: isWebp ? item : null,
              mobileWebp: null,
              blur: null,
              alt:
                index === 0
                  ? fallbackAlt
                  : `Luxury Perfume & Attar Collection ${index + 1}`,
              brandName: null,
              focus: null,
              mobileFocus: null,
              brightness: 1,
              fit: 'cover',
              mobileFit: 'cover',
              duration: null,
            }
          }
          const fit = item.fit || 'cover'
          return {
            layout: item.layout === 'showcase' ? 'showcase' : 'photo',
            src: item.src || item.url || item.image || item.cover_image_url || '',
            webp:
              item.webp ||
              (typeof item.src === 'string' && item.src.endsWith('.webp') ? item.src : null),
            mobileWebp: item.mobileWebp || null,
            blur: item.blur || null,
            alt:
              item.alt ||
              (index === 0 ? fallbackAlt : 'Luxury Perfume & Attar Collection'),
            brandName: item.brandName || item.name || null,
            focus: item.focus || null,
            mobileFocus: item.mobileFocus || null,
            brightness: item.brightness ?? 1,
            fit,
            mobileFit: item.mobileFit || fit,
            duration: Number.isFinite(item.duration) ? item.duration : null,
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
      layout: 'showcase',
      src: IMAGES.heroBackground,
      webp: IMAGES.heroBackgroundWebp,
      mobileWebp: IMAGES.heroBackgroundMobile,
      blur: '/hero/hero-signature-blur.webp',
      alt: fallbackAlt,
      brandName: 'Arees Perfumes',
      focus: '85% 40%',
      mobileFocus: '50% 42%',
      brightness: 1,
      fit: 'cover',
      mobileFit: 'cover',
      duration: null,
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
  const activeLayout = validSlides[activeSlide.index]?.layout || 'photo'
  const activeDuration =
    validSlides[activeSlide.index]?.duration ?? displayDuration

  // Preload upcoming images in the background after initial render settles
  useEffect(() => {
    if (totalSlides <= 1) return
    const nextIdx = (activeSlide.index + 1) % totalSlides
    const nextNextIdx = (activeSlide.index + 2) % totalSlides

    const isMobileViewport =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(MOBILE_MEDIA).matches

    const preload = (slide) => {
      if (!slide) return
      const targetSrc =
        (isMobileViewport && slide.mobileWebp) || slide.webp || slide.src
      if (targetSrc && typeof window !== 'undefined' && typeof Image !== 'undefined') {
        const img = new Image()
        img.src = targetSrc
      }
      if (slide.blur && typeof window !== 'undefined' && typeof Image !== 'undefined') {
        const img = new Image()
        img.src = slide.blur
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

  // Schedule next slide transition after this slide's display duration
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
    }, activeDuration)

    return () => clearTimeout(timer)
  }, [activeSlide, activeDuration, totalSlides])

  const motionClassFor = (slideIndex, variant) => {
    const slide = validSlides[slideIndex]
    if (slide?.layout === 'showcase') return 'cinematic-motion-static'
    return totalSlides > 1
      ? `cinematic-motion-${variant}`
      : 'cinematic-motion-single'
  }

  // Render individual slide media
  const renderSlideMedia = (slideIndex, isFirst = false) => {
    const slide = validSlides[slideIndex] || validSlides[0]
    const imageStyle = {
      '--hero-focus': slide.focus || 'center',
      '--hero-mobile-focus': slide.mobileFocus || slide.focus || 'center 38%',
      '--hero-image-brightness': slide.brightness ?? 1,
      '--hero-art-fit': slide.fit || 'contain',
      '--hero-mobile-art-fit': slide.mobileFit || slide.fit || 'contain',
    }

    if (slide.layout === 'showcase') {
      return (
        <div className="cinematic-showcase">
          <img
            className="cinematic-showcase-backdrop"
            src={slide.blur || slide.src}
            alt=""
            aria-hidden="true"
            decoding="async"
          />
          <div className="cinematic-showcase-panel">
            <picture className="cinematic-showcase-picture">
              {slide.mobileWebp && (
                <source media={MOBILE_MEDIA} type="image/webp" srcSet={slide.mobileWebp} />
              )}
              {slide.webp && <source type="image/webp" srcSet={slide.webp} />}
              <img
                src={slide.src}
                alt={slide.alt || fallbackAlt}
                className={`cinematic-showcase-art cinematic-showcase-art--${
                  slide.fit === 'cover' ? 'cover' : 'contain'
                } cinematic-showcase-art--mobile-${
                  slide.mobileFit === 'cover' ? 'cover' : 'contain'
                }`}
                style={imageStyle}
                fetchpriority={isFirst ? 'high' : 'auto'}
                decoding="async"
              />
            </picture>
          </div>
        </div>
      )
    }

    return (
      <picture className="hero-picture cinematic-hero-picture">
        {slide.mobileWebp && (
          <source media={MOBILE_MEDIA} type="image/webp" srcSet={slide.mobileWebp} />
        )}
        {slide.webp && <source type="image/webp" srcSet={slide.webp} />}
        <img
          src={slide.src}
          alt={slide.alt || fallbackAlt}
          className="hero-img hero-bg cinematic-hero-img"
          style={imageStyle}
          fetchpriority={isFirst ? 'high' : 'auto'}
          decoding="async"
        />
      </picture>
    )
  }

  return (
    <section className={`hero hero--${activeLayout}`}>
      {/* Background image layer: contains the continuous cinematic slideshow */}
      <div className="hero-background-layer">
        {/* Outgoing slide: stays at full opacity underneath during crossfade */}
        {outgoingSlide && (
          <div
            key={outgoingSlide.key}
            className="cinematic-hero-slide cinematic-hero-slide--outgoing"
            style={{ '--fade-duration': `${fadeDuration}ms` }}
          >
            <div
              className={`cinematic-hero-media ${motionClassFor(
                outgoingSlide.index,
                outgoingSlide.variant
              )}`}
            >
              {renderSlideMedia(outgoingSlide.index)}
            </div>
          </div>
        )}

        {/* Active / incoming slide */}
        <div
          key={activeSlide.key}
          className={`cinematic-hero-slide cinematic-hero-slide--active ${
            isTransitioning ? 'cinematic-hero-slide--incoming' : ''
          }`}
          style={{ '--fade-duration': `${fadeDuration}ms` }}
        >
          <div
            className={`cinematic-hero-media ${motionClassFor(
              activeSlide.index,
              activeSlide.variant
            )}`}
          >
            {renderSlideMedia(
              activeSlide.index,
              activeSlide.index === 0 && !outgoingSlide
            )}
          </div>
        </div>
      </div>

      {/* Dark cinematic overlay: above images, below text/buttons */}
      <div className="hero-overlay" aria-hidden="true" />

      {/* Fixed hero content */}
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
