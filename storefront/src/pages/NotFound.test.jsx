// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import NotFound from './NotFound'

afterEach(() => {
  cleanup()
  document.title = ''
  document.head.querySelectorAll('[data-seo="true"]').forEach((node) => node.remove())
})

describe('NotFound page', () => {
  it('shows a helpful not-found message and is excluded from indexing', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-page']}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse attars and perfumes' }).getAttribute('href')).toBe('/shop')
    expect(document.title).toBe('Page Not Found | Arees Perfumes')
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow')
  })
})
