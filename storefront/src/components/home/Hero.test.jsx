// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hero from './Hero'
import { HERO } from '../../data/content'

describe('Hero Component', () => {
  afterEach(() => cleanup())

  it('renders the framed showcase artwork with picture element, source, and img', () => {
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    )

    const img = screen.getByRole('img', { name: /Arees 8ml roll-on attars/i })
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/hero/rollon-8ml.webp')
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(img.getAttribute('decoding')).toBe('async')
    expect(img.classList.contains('cinematic-showcase-art')).toBe(true)

    const mobileSource = document.querySelector(
      '.cinematic-showcase-picture source[media]'
    )
    expect(mobileSource).toBeTruthy()
    expect(mobileSource.getAttribute('srcset')).toBe('/hero/rollon-8ml-mobile.webp')
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
    for (const line of HERO.title) {
      expect(heading.textContent).toContain(line)
    }

    // Tagline
    expect(screen.getByText(HERO.subtitle)).toBeTruthy()

    // Primary CTA
    const primaryBtn = screen.getByRole('link', { name: new RegExp(HERO.primaryCta.label, 'i') })
    expect(primaryBtn).toBeTruthy()
    expect(primaryBtn.getAttribute('href')).toBe(HERO.primaryCta.to)
    expect(primaryBtn.classList.contains('hero-btn-primary')).toBe(true)

    // Secondary CTA
    const secondaryBtn = screen.getByRole('link', { name: new RegExp(HERO.secondaryCta.label, 'i') })
    expect(secondaryBtn).toBeTruthy()
    expect(secondaryBtn.getAttribute('href')).toBe(HERO.secondaryCta.to)
    expect(secondaryBtn.classList.contains('hero-btn-secondary')).toBe(true)
    expect(secondaryBtn.classList.contains('btn-outline-light')).toBe(false)
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
