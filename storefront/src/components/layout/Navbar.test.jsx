// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    itemCount: 2,
    brands: [
      { name: 'Arees 8ml', slug: 'arees-8ml', is_active: true, display_order: 1 },
    ],
    brandsLoaded: true,
  }),
}))

afterEach(() => cleanup())

describe('Navbar', () => {
  it('renders the WhatsApp action beside search and cart', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    const whatsapp = screen.getByRole('link', { name: /chat with us on whatsapp/i })
    expect(whatsapp).toBeTruthy()
    expect(whatsapp.getAttribute('href')).toContain('wa.me')
    expect(whatsapp.getAttribute('target')).toBe('_blank')
    expect(whatsapp.getAttribute('rel')).toContain('noopener')

    expect(screen.getByRole('button', { name: /search products/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /cart, 2 items/i })).toBeTruthy()
  })
})
