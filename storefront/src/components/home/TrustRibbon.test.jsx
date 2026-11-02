// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrustRibbon from './TrustRibbon'
import { HOME_FAQS } from '../../data/content'

afterEach(() => cleanup())

// The ribbon must only ever contain claims the site can prove. These guard
// against accidental "COD" or fixed delivery-window wording being added.
const FORBIDDEN = [/cash on delivery/i, /cod\b/i, /working day/i, /^\s*free shipping/i]

describe('TrustRibbon', () => {
  it('renders the five factual assurances', () => {
    render(
      <MemoryRouter>
        <TrustRibbon />
      </MemoryRouter>
    )

    expect(screen.getByText('100% alcohol-free oils')).toBeTruthy()
    expect(screen.getByText('Authentic attars & oud')).toBeTruthy()
    expect(screen.getByText('Advance payment via UPI')).toBeTruthy()
    expect(screen.getByText('Pan-India delivery')).toBeTruthy()
    expect(screen.getByText('Wholesale & export support')).toBeTruthy()
  })

  it('keeps the alcohol-free promise consistent with the homepage FAQ copy', () => {
    render(
      <MemoryRouter>
        <TrustRibbon />
      </MemoryRouter>
    )
    const faq = HOME_FAQS.find((f) => /alcohol-free/i.test(f.question))
    expect(faq).toBeTruthy()
  })

  it('links delivery and wholesale items to their policy pages', () => {
    const { container } = render(
      <MemoryRouter>
        <TrustRibbon />
      </MemoryRouter>
    )

    const links = [...container.querySelectorAll('.trust-ribbon-link')]
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/shipping-returns')
    expect(hrefs).toContain('/hikma-exports')
  })

  it('never claims COD or a guaranteed dispatch window', () => {
    const { container } = render(
      <MemoryRouter>
        <TrustRibbon />
      </MemoryRouter>
    )

    const text = container.textContent || ''
    for (const pattern of FORBIDDEN) {
      expect(pattern.test(text)).toBe(false)
    }
  })
})
