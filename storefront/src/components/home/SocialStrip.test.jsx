// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SocialStrip from './SocialStrip'

const mockProducts = [
  { id: 1, name: 'Arees 8ml', image: 'arees-8ml.jpg' },
  { id: 2, name: 'Dahab 6ml', image: 'dahab-6ml.jpg' },
  { id: 3, name: 'Arees Bakhoor', image: 'bakhoor.jpg' },
  { id: 4, name: 'Arees Luxury', image: 'luxury.jpg' },
  { id: 5, name: 'Arees 12ml', image: '12ml.jpg' },
]

describe('SocialStrip Component', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => cleanup())

  it('renders section header with From the Atelier eyebrow and title', () => {
    render(
      <MemoryRouter>
        <SocialStrip products={mockProducts} />
      </MemoryRouter>
    )

    expect(screen.getByText(/from the atelier/i)).toBeTruthy()
    expect(screen.getByText(/follow our journey/i)).toBeTruthy()
    expect(screen.getByText(/scents, made by hand/i)).toBeTruthy()
  })

  it('renders product image links without Instagram icon overlays', () => {
    render(
      <MemoryRouter>
        <SocialStrip products={mockProducts} />
      </MemoryRouter>
    )

    const links = screen.getAllByRole('link', { name: /from our atelier/i })
    expect(links.length).toBe(5)

    // Ensure images are present
    const images = screen.getAllByRole('img')
    expect(images.length).toBe(5)
  })

  it('renders pagination dots for each item and allows clicking to scroll', () => {
    render(
      <MemoryRouter>
        <SocialStrip products={mockProducts} />
      </MemoryRouter>
    )

    const dots = screen.getAllByRole('button', { name: /go to slide/i })
    expect(dots.length).toBe(5)

    // First dot active by default
    expect(dots[0].getAttribute('aria-current')).toBe('true')
    expect(dots[1].getAttribute('aria-current')).toBe('false')

    // Click dot 2
    fireEvent.click(dots[1])
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })
})
