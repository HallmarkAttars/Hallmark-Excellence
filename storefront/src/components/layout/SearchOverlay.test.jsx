// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SearchOverlay from './SearchOverlay'

// Mock getProducts API
const mockProducts = [
  { id: 1, name: 'Arees Musk 8ML', category_name: 'Attar', brand_name: 'Arees', is_featured: true, rating: 4.8 },
  { id: 2, name: 'Royal Oud Attar', category_name: 'Attar', brand_name: 'Dahab', is_featured: false, rating: 4.5 },
  { id: 3, name: 'Musk Tahara Oil', category_name: 'Fragrance Oil', brand_name: 'Arees', is_featured: false, rating: 4.2 },
]

vi.mock('../../services/mockApi', () => ({
  getProducts: vi.fn(() => Promise.resolve(mockProducts)),
}))

describe('SearchOverlay Component', () => {
  let onCloseMock

  beforeEach(() => {
    onCloseMock = vi.fn()
  })

  afterEach(() => cleanup())

  it('renders search overlay with search input and close button', async () => {
    render(
      <MemoryRouter>
        <SearchOverlay open={true} onClose={onCloseMock} />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/search attars, oud, musk/i)
    expect(input).toBeTruthy()

    const closeBtn = screen.getByRole('button', { name: /close search/i })
    expect(closeBtn).toBeTruthy()

    fireEvent.click(closeBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('shows clear button when text is typed and clears text without calling onClose', async () => {
    render(
      <MemoryRouter>
        <SearchOverlay open={true} onClose={onCloseMock} />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/search attars, oud, musk/i)
    fireEvent.change(input, { target: { value: 'musk' } })

    const clearBtn = screen.getByRole('button', { name: /clear search query/i })
    expect(clearBtn).toBeTruthy()

    fireEvent.click(clearBtn)
    expect(input.value).toBe('')
    expect(onCloseMock).not.toHaveBeenCalled()
  })

  it('displays dynamic results context header when query is entered', async () => {
    render(
      <MemoryRouter>
        <SearchOverlay open={true} onClose={onCloseMock} />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/search attars, oud, musk/i)
    fireEvent.change(input, { target: { value: 'musk' } })

    await waitFor(() => {
      expect(screen.getByText(/search results for/i)).toBeTruthy()
      expect(screen.getByText(/"musk"/i)).toBeTruthy()
      expect(screen.getByText(/2 products/i)).toBeTruthy()
    })
  })

  it('shows empty state with suggestions when no products match, and clicking suggestion fills input', async () => {
    render(
      <MemoryRouter>
        <SearchOverlay open={true} onClose={onCloseMock} />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/search attars, oud, musk/i)
    fireEvent.change(input, { target: { value: 'nonexistentproductxyz' } })

    await waitFor(() => {
      expect(screen.getByText(/no fragrances found/i)).toBeTruthy()
      expect(screen.getByText(/try searching for:/i)).toBeTruthy()
    })

    const oudChip = screen.getByRole('button', { name: 'Oud' })
    expect(oudChip).toBeTruthy()

    fireEvent.click(oudChip)
    expect(input.value).toBe('Oud')
  })

  it('allows filtering by category and sorting', async () => {
    render(
      <MemoryRouter>
        <SearchOverlay open={true} onClose={onCloseMock} />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/search attars, oud, musk/i)
    fireEvent.change(input, { target: { value: 'musk' } })

    await waitFor(() => {
      expect(screen.getByLabelText(/filter by category/i)).toBeTruthy()
    })

    const categorySelect = screen.getByLabelText(/filter by category/i)
    fireEvent.change(categorySelect, { target: { value: 'Attar' } })

    await waitFor(() => {
      expect(screen.getByText(/1 product/i)).toBeTruthy()
    })
  })
})
