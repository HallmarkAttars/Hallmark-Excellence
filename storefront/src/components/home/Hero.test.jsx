// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hero from './Hero'
import { HERO } from '../../data/content'
import { IMAGES } from '../../config/assets'

describe('Hero Component', () => {
  afterEach(() => cleanup())

  it('renders hero image with picture element, source, and img', () => {
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    )

    const img = screen.getByRole('img', { name: /Hallmark luxury perfume and attar collection/i })
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe(IMAGES.heroBackground)
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(img.getAttribute('decoding')).toBe('async')
    expect(img.classList.contains('hero-img')).toBe(true)
    expect(img.classList.contains('hero-bg')).toBe(true)
  })

  it('renders title, tagline, and CTA links', () => {
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    )

    // Heading
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeTruthy()
    expect(heading.textContent).toContain('The Art of')

    // Tagline
    expect(screen.getByText(HERO.subtitle)).toBeTruthy()

    // Primary CTA
    const primaryBtn = screen.getByRole('link', { name: new RegExp(HERO.primaryCta.label, 'i') })
    expect(primaryBtn).toBeTruthy()
    expect(primaryBtn.getAttribute('href')).toBe(HERO.primaryCta.to)

    // Secondary CTA
    const secondaryBtn = screen.getByRole('link', { name: new RegExp(HERO.secondaryCta.label, 'i') })
    expect(secondaryBtn).toBeTruthy()
    expect(secondaryBtn.getAttribute('href')).toBe(HERO.secondaryCta.to)
  })

  it('renders overlay and content elements', () => {
    const { container } = render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    )

    expect(container.querySelector('.hero-overlay')).toBeTruthy()
    expect(container.querySelector('.hero-content')).toBeTruthy()
  })
})
