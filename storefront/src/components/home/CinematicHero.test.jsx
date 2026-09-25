// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CinematicHero from './CinematicHero'
import { HERO } from '../../data/content'
import { IMAGES } from '../../config/assets'

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
    expect(heading.textContent).toContain('The Art of')
    expect(heading.textContent).toContain('Arees')
    expect(heading.textContent).toContain('Perfumes')

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
