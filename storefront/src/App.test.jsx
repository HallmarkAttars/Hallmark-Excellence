// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import App from './App'

// Keep the root smoke test deterministic: the shell fires catalog reads on
// mount, and letting real (never-resolving) fetches settle after jsdom tears
// down produces an unhandled "window is not defined" render error.
vi.mock('./services/mockApi', () => ({
  getCategories: () => new Promise(() => {}),
  getBrands: () => new Promise(() => {}),
  getFeaturedProducts: () => new Promise(() => {}),
}))

// Unmount explicitly before the jsdom environment is torn down so deferred
// effects (e.g. Home's idle callback) cannot commit after `window` is gone.
afterEach(cleanup)

describe('App Root Component', () => {
  it('renders App without crashing', async () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
