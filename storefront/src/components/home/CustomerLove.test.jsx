// @vitest-environment jsdom
//
// Behavioral tests for the home "customer love" strip (CustomerLove.jsx):
//  - renders NOTHING while loading, on empty data, on API failure, or on a
//    null payload — the strip is decorative trust-building and must never
//    show an empty or broken section on the home page
//  - with reviews present it renders cards with stars, text and FIRST names
//    only (the server already strips last names)
//  - the strip hits /reviews/public, never any admin endpoint

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CustomerLove from './CustomerLove'

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}))

import { api } from '../../services/api'

function rows() {
  return [
    {
      rating: 5,
      review_text: 'The attar lasted the whole day on me.',
      first_name: 'Fathima',
      created_at: '2026-05-02T10:00:00Z',
    },
    {
      rating: 4,
      review_text: 'Good oud, a bit strong for office wear.',
      first_name: 'Anand',
      created_at: '2026-05-04T10:00:00Z',
    },
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CustomerLove', () => {
  it('renders nothing while the fetch is still in flight', () => {
    api.get.mockReturnValue(new Promise(() => {}))
    const { container } = render(<CustomerLove />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when there are no reviews yet', async () => {
    api.get.mockResolvedValue({ reviews: [] })
    const { container } = render(<CustomerLove />)
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when the fetch fails (strip is decorative)', async () => {
    api.get.mockRejectedValue(new Error('offline'))
    const { container } = render(<CustomerLove />)
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })

  it('renders review cards with first names, stars and text once loaded', async () => {
    api.get.mockResolvedValue({ reviews: rows() })
    render(<CustomerLove />)

    const region = await screen.findByRole('region', { name: 'Customer reviews' })
    expect(region).toBeTruthy()

    expect(screen.getByText('Real Words, Real Customers')).toBeTruthy()
    expect(screen.getByText(/lasted the whole day/)).toBeTruthy()
    expect(screen.getByText(/bit strong for office/)).toBeTruthy()

    const cards = document.querySelectorAll('.customer-love-card')
    expect(cards).toHaveLength(2)

    const names = Array.from(document.querySelectorAll('.customer-love-name')).map((el) =>
      el.textContent
    )
    expect(names).toEqual(['— Fathima', '— Anand'])

    const aria = Array.from(document.querySelectorAll('.customer-love-stars')).map((el) =>
      el.getAttribute('aria-label')
    )
    expect(aria).toEqual(['5 out of 5 stars', '4 out of 5 stars'])
  })

  it('hides the whole section if the server returns null payloads', async () => {
    api.get.mockResolvedValue(null)
    const { container } = render(<CustomerLove />)
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })
})
