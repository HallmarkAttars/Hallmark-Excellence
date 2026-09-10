// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from './Footer'

// Mock CartContext
vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    brands: [
      { name: 'Arees 8ml', slug: 'arees-8ml', is_active: true, display_order: 1 },
      { name: 'Dahab 6ml', slug: 'dahab-6ml', is_active: true, display_order: 2 },
    ],
  }),
}))

let isMobile = false

describe('Footer Component', () => {
  beforeEach(() => {
    isMobile = false
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('max-width: 767px') ? isMobile : !isMobile,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => cleanup())

  describe('Desktop behavior (≥768px)', () => {
    beforeEach(() => {
      isMobile = false
      window.innerWidth = 1024
    })

    it('renders static headings and no mobile accordion trigger buttons', () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      )

      // Section headings should be regular h4 elements
      const shopHeading = screen.getByRole('heading', { level: 4, name: 'Shop' })
      const companyHeading = screen.getByRole('heading', { level: 4, name: 'Company' })
      const contactHeading = screen.getByRole('heading', { level: 4, name: 'Contact' })

      expect(shopHeading).toBeTruthy()
      expect(companyHeading).toBeTruthy()
      expect(contactHeading).toBeTruthy()

      // Accordion buttons should not exist on desktop
      expect(screen.queryByRole('button', { name: /shop/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /company/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /contact/i })).toBeNull()
    })

    it('renders all links, contact rows, and copyright', () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      )

      expect(screen.getByText('All Attars')).toBeTruthy()
      expect(screen.getByText('Categories')).toBeTruthy()
      expect(screen.getByText('Arees 8ml')).toBeTruthy()
      expect(screen.getByText('About Us')).toBeTruthy()
      expect(screen.getByText('hikmaexports@gmail.com')).toBeTruthy()
      expect(screen.getByText('Chat with us on WhatsApp')).toBeTruthy()
      expect(screen.getByText('© 2026 Arees & Dahab. All rights reserved.')).toBeTruthy()
    })
  })

  describe('Mobile behavior (<768px)', () => {
    beforeEach(() => {
      isMobile = true
      window.innerWidth = 390
    })

    it('renders collapsed accordion buttons with aria-expanded="false" by default', () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      )

      const shopBtn = screen.getByRole('button', { name: /shop/i })
      const companyBtn = screen.getByRole('button', { name: /company/i })
      const contactBtn = screen.getByRole('button', { name: /contact/i })

      expect(shopBtn).toBeTruthy()
      expect(shopBtn.getAttribute('aria-expanded')).toBe('false')
      expect(shopBtn.getAttribute('aria-controls')).toBe('footer-section-shop')

      expect(companyBtn.getAttribute('aria-expanded')).toBe('false')
      expect(contactBtn.getAttribute('aria-expanded')).toBe('false')
    })

    it('toggles Shop section when tapped, updating aria-expanded and class', () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      )

      const shopBtn = screen.getByRole('button', { name: /shop/i })
      const shopContent = document.getElementById('footer-section-shop')

      expect(shopBtn.getAttribute('aria-expanded')).toBe('false')
      expect(shopContent.classList.contains('is-open')).toBe(false)

      // Expand Shop
      fireEvent.click(shopBtn)
      expect(shopBtn.getAttribute('aria-expanded')).toBe('true')
      expect(shopBtn.classList.contains('is-open')).toBe(true)
      expect(shopContent.classList.contains('is-open')).toBe(true)

      // Collapse Shop
      fireEvent.click(shopBtn)
      expect(shopBtn.getAttribute('aria-expanded')).toBe('false')
      expect(shopBtn.classList.contains('is-open')).toBe(false)
      expect(shopContent.classList.contains('is-open')).toBe(false)
    })

    it('expands Contact section and displays tappable contact rows and WhatsApp CTA', () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      )

      const contactBtn = screen.getByRole('button', { name: /contact/i })
      fireEvent.click(contactBtn)

      expect(contactBtn.getAttribute('aria-expanded')).toBe('true')

      const phoneLink = screen.getByRole('link', { name: /\+91 98407 50467/i })
      expect(phoneLink.getAttribute('href')).toBe('tel:+919840750467')

      const emailLink = screen.getByRole('link', { name: /hikmaexports@gmail\.com/i })
      expect(emailLink.getAttribute('href')).toBe('mailto:hikmaexports@gmail.com')

      const whatsappCta = screen.getByRole('link', { name: /chat with us on whatsapp/i })
      expect(whatsappCta.getAttribute('href')).toContain('https://wa.me/919840078909')
      expect(whatsappCta.getAttribute('target')).toBe('_blank')
    })
  })
})
