// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CinematicHero from './CinematicHero'
import { HERO } from '../../data/content'

describe('CinematicHero Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('renders exact hero content (title, tagline, CTAs, overlay)', () => {
    const { container } = render(
      <MemoryRouter>
        <CinematicHero />
      </MemoryRouter>
    )

    // Heading structure
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeTruthy()
    expect(heading.textContent).toContain('Buy Authentic')
    expect(heading.textContent).toContain('Non-Alcoholic Attars')
    expect(heading.textContent).toContain('Fragrance Oils Online')

    // Tagline
    expect(screen.getByText(HERO.subtitle)).toBeTruthy()

    // CTAs
    const primaryBtn = screen.getByRole('link', { name: new RegExp(HERO.primaryCta.label, 'i') })
    expect(primaryBtn.getAttribute('href')).toBe(HERO.primaryCta.to)

    const secondaryBtn = screen.getByRole('link', { name: new RegExp(HERO.secondaryCta.label, 'i') })
    expect(secondaryBtn.getAttribute('href')).toBe(HERO.secondaryCta.to)

    // Layers
    expect(container.querySelector('.hero-background-layer')).toBeTruthy()
    expect(container.querySelector('.hero-overlay')).toBeTruthy()
    expect(container.querySelector('.hero-content')).toBeTruthy()
  })

  it('renders with custom dynamic images prop', () => {
    const customImages = [
      '/brand-a.webp',
      '/brand-b.webp',
      '/brand-c.webp',
    ]

    const { container } = render(
      <MemoryRouter>
        <CinematicHero images={customImages} />
      </MemoryRouter>
    )

    const activeImg = container.querySelector('.cinematic-hero-slide--active img')
    expect(activeImg).toBeTruthy()
    expect(activeImg.getAttribute('src')).toBe('/brand-a.webp')
  })

  it('smoothly cycles to next slide after display duration with crossfade', async () => {
    const customImages = [
      '/brand-a.webp',
      '/brand-b.webp',
    ]

    const { container } = render(
      <MemoryRouter>
        <CinematicHero images={customImages} displayDuration={5000} fadeDuration={1800} />
      </MemoryRouter>
    )

    // Initial state: slide 0 is active
    expect(container.querySelector('.cinematic-hero-slide--active img').getAttribute('src')).toBe('/brand-a.webp')
    expect(container.querySelector('.cinematic-hero-slide--outgoing')).toBeNull()

    // Advance to 5000ms: transition begins
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // During crossfade: both incoming (brand-b) and outgoing (brand-a) exist
    const incomingSlide = container.querySelector('.cinematic-hero-slide--incoming')
    const outgoingSlide = container.querySelector('.cinematic-hero-slide--outgoing')
    expect(incomingSlide).toBeTruthy()
    expect(outgoingSlide).toBeTruthy()
    expect(incomingSlide.querySelector('img').getAttribute('src')).toBe('/brand-b.webp')
    expect(outgoingSlide.querySelector('img').getAttribute('src')).toBe('/brand-a.webp')

    // Advance past fade duration (1800ms): outgoing slide is cleaned up
    act(() => {
      vi.advanceTimersByTime(1800)
    })

    expect(container.querySelector('.cinematic-hero-slide--outgoing')).toBeNull()
    expect(container.querySelector('.cinematic-hero-slide--active img').getAttribute('src')).toBe('/brand-b.webp')
  })

  it('applies per-slide focal points and brightness', () => {
    const customImages = [
      {
        src: '/brand-a.webp',
        mobileWebp: '/brand-a-mobile.webp',
        alt: 'Brand A product',
        focus: '62% 44%',
        mobileFocus: '55% 32%',
        brightness: 0.82,
      },
    ]

    const { container } = render(
      <MemoryRouter>
        <CinematicHero images={customImages} />
      </MemoryRouter>
    )

    const img = container.querySelector('.cinematic-hero-slide--active img')
    expect(img.style.getPropertyValue('--hero-focus')).toBe('62% 44%')
    expect(img.style.getPropertyValue('--hero-mobile-focus')).toBe('55% 32%')
    expect(img.style.getPropertyValue('--hero-image-brightness')).toBe('0.82')

    const mobileSource = container.querySelector('.cinematic-hero-picture source[media]')
    expect(mobileSource.getAttribute('srcset')).toBe('/brand-a-mobile.webp')
  })

  it('falls back to the curated catalogue hero instead of database imagery', () => {
    const { container } = render(
      <MemoryRouter>
        <CinematicHero />
      </MemoryRouter>
    )

    const img = container.querySelector(
      '.cinematic-hero-slide--active .cinematic-hero-img'
    )
    expect(img.getAttribute('src')).toBe('/hero/rollon-8ml.webp')

    const mobileSource = container.querySelector(
      '.cinematic-hero-picture source[media]'
    )
    expect(mobileSource.getAttribute('srcset')).toBe('/hero/rollon-8ml-mobile.webp')
  })

  it('renders the curated hero as full-bleed photo slides', () => {
    const { container } = render(
      <MemoryRouter>
        <CinematicHero />
      </MemoryRouter>
    )

    expect(container.querySelector('.hero--photo')).toBeTruthy()
    expect(container.querySelector('.cinematic-showcase')).toBeNull()

    const img = container.querySelector('.cinematic-hero-slide--active .cinematic-hero-img')
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/hero/rollon-8ml.webp')
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(img.style.getPropertyValue('--hero-mobile-focus')).toBe('50% 42%')

    const mobileSource = container.querySelector('.cinematic-hero-picture source[media]')
    expect(mobileSource.getAttribute('srcset')).toBe('/hero/rollon-8ml-mobile.webp')
  })

  it('cycles through the five curated catalogue graphics with crossfade', () => {
    const { container } = render(
      <MemoryRouter>
        <CinematicHero displayDuration={7000} fadeDuration={1800} />
      </MemoryRouter>
    )

    const expectedSlides = [
      '/hero/rollon-8ml.webp',
      '/hero/bakhoor.webp',
      '/hero/bulk-1kg.webp',
      '/hero/luxury-12ml.webp',
      '/wholesale/rollon-bottle-range.webp',
    ]

    for (let i = 0; i < expectedSlides.length; i += 1) {
      expect(
        container
          .querySelector('.cinematic-hero-slide--active .cinematic-hero-img')
          .getAttribute('src')
      ).toBe(expectedSlides[i])

      act(() => {
        vi.advanceTimersByTime(7000)
      })
    }

    // After the last slide the rotation loops back to the first graphic.
    expect(
      container
        .querySelector('.cinematic-hero-slide--active .cinematic-hero-img')
        .getAttribute('src')
    ).toBe(expectedSlides[0])
  })

  it('honours per-slide display durations', () => {
    const timedImages = [
      { src: '/brand-a.webp', duration: 3000 },
      { src: '/brand-b.webp', duration: 9000 },
    ]

    const { container } = render(
      <MemoryRouter>
        <CinematicHero images={timedImages} displayDuration={5000} fadeDuration={1800} />
      </MemoryRouter>
    )

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(container.querySelector('.cinematic-hero-slide--outgoing')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(container.querySelector('.cinematic-hero-slide--incoming img').getAttribute('src')).toBe(
      '/brand-b.webp'
    )

    act(() => {
      vi.advanceTimersByTime(1800)
    })
    expect(container.querySelector('.cinematic-hero-slide--active img').getAttribute('src')).toBe(
      '/brand-b.webp'
    )

    act(() => {
      vi.advanceTimersByTime(7199)
    })
    expect(container.querySelector('.cinematic-hero-slide--outgoing')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(container.querySelector('.cinematic-hero-slide--incoming img').getAttribute('src')).toBe(
      '/brand-a.webp'
    )
  })

  it('cycles infinitely back to slide 0 without resetting or breaking', async () => {
    const customImages = [
      '/brand-1.webp',
      '/brand-2.webp',
    ]

    const { container } = render(
      <MemoryRouter>
        <CinematicHero images={customImages} displayDuration={5000} fadeDuration={1800} />
      </MemoryRouter>
    )

    // Advance to slide 2
    act(() => {
      vi.advanceTimersByTime(6800)
    })
    expect(container.querySelector('.cinematic-hero-slide--active img').getAttribute('src')).toBe('/brand-2.webp')

    // Advance again: should loop back to slide 1
    act(() => {
      vi.advanceTimersByTime(6800)
    })
    expect(container.querySelector('.cinematic-hero-slide--active img').getAttribute('src')).toBe('/brand-1.webp')
  })
})
