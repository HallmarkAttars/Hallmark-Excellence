import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HERO } from '../../data/content'
import { buildHomeHeroImages } from '../../utils/homeHeroImages'
import './Hero.css'
import './CinematicHero.css'

const DEFAULT_DISPLAY_DURATION = 5500 // ~5.5s display before crossfade starts
const DEFAULT_FADE_DURATION = 1800 // 1.8s smooth crossfade
const MOTION_VARIANTS_COUNT = 6
const MOBILE_MEDIA = '(max-width: 767px)'

const fallbackAlt = 'Arees Perfumes — Hallmark luxury perfume and attar collection'

/**
 * CinematicHero — full-bleed luxury perfume slideshow with Ken Burns camera
 * movement and continuous crossfades.
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
              mobileWebp: null,
              alt:
                index === 0
                  ? fallbackAlt
                  : `Luxury Perfume & Attar Collection ${index + 1}`,
              brandName: null,
              focus: null,
              tabletFocus: null,
              mobileFocus: null,
              brightness: 1,
              duration: null,
            }
          }
          return {
            src: item.src || item.url || item.image || item.cover_image_url || '',
            webp:
              item.webp ||
              (typeof item.src === 'string' && item.src.endsWith('.webp') ? item.src : null),
            mobileWebp: item.mobileWebp || null,
            alt:
              item.alt ||
              (index === 0 ? fallbackAlt : 'Luxury Perfume & Attar Collection'),
            brandName: item.brandName || item.name || null,
            focus: item.focus || null,
            tabletFocus: item.tabletFocus || null,
            mobileFocus: item.mobileFocus || null,
            brightness: item.brightness ?? 1,
            duration: Number.isFinite(item.duration) ? item.duration : null,
          }
        })
        .filter((img) => Boolean(img?.src))
    }

    return buildHomeHeroImages()
  }, [images])

  const validSlides = slideList.length > 0 ? slideList : [buildHomeHeroImages()[0]]
  const totalSlides = validSlides.length

  const [activeSlide, setActiveSlide] = useState({
    index: 0,
    variant: 0,
    key: 'slide-0-0',
  })
  const [outgoingSlide, setOutgoingSlide] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const stepCounterRef = useRef(0)
  const activeDuration =
    validSlides[activeSlide.index]?.duration ?? displayDuration

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
    }

    const timer = setTimeout(() => {
      preload(validSlides[nextIdx])
      if (totalSlides > 2) {
        preload(validSlides[nextNextIdx])
      }
    }, 2500)

    return () => clearTimeout(timer)
  }, [activeSlide.index, totalSlides, validSlides])

  useEffect(() => {
    if (!outgoingSlide) return
    const timer = setTimeout(() => {
      setOutgoingSlide(null)
      setIsTransitioning(false)
    }, fadeDuration)

    return () => clearTimeout(timer)
  }, [outgoingSlide, fadeDuration])

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

  const motionClassFor = (slideIndex, variant) =>
    totalSlides > 1 ? `cinematic-motion-${variant}` : 'cinematic-motion-single'

  const renderSlideMedia = (slideIndex, isFirst = false) => {
    const slide = validSlides[slideIndex] || validSlides[0]
    const imageStyle = {
      '--hero-focus': slide.focus || 'center',
      '--hero-tablet-focus':
        slide.tabletFocus || slide.focus || 'center 42%',
      '--hero-mobile-focus':
        slide.mobileFocus || slide.focus || 'center 42%',
      '--hero-image-brightness': slide.brightness ?? 1,
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
    <section className="hero hero--photo">
      <div className="hero-background-layer">
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

      <div className="hero-overlay" aria-hidden="true" />

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
