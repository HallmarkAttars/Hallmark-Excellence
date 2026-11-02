// @vitest-environment jsdom
//
// HomeFaqs (Batch 1 SEO): FAQ + wholesale CTA + honest price anchor on the
// homepage. Mirrors the facts rendered server-side by meta.js.
import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeFaqs from './HomeFaqs'
import { HOME_FAQS } from '../../data/content'

afterEach(cleanup)

describe('HomeFaqs', () => {
  it('renders the FAQ questions and answers', () => {
    render(
      <MemoryRouter>
        <HomeFaqs />
      </MemoryRouter>,
    )
    expect(screen.getByText('Frequently Asked Questions')).toBeTruthy()
    for (const faq of HOME_FAQS) {
      expect(screen.getByText(faq.question)).toBeTruthy()
      // Answers are accordion-hidden by default; open each to verify content
      const question = screen.getByText(faq.question)
      fireEvent.click(question.closest('.home-faq-q'))
      expect(screen.getByText(faq.answer)).toBeTruthy()
    }
  })

  it('shows an honest price anchor computed from product prices', () => {
    const products = [
      { id: 'p-1', name: 'A', price: 500, variants: [] },
      { id: 'p-2', name: 'B', price: 0, variants: [{ id: 'v-1', total_price: 220 }] },
    ]
    render(
      <MemoryRouter>
        <HomeFaqs products={products} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/from ₹220/)).toBeTruthy()
  })

  it('omits the price anchor when no product carries a price', () => {
    render(
      <MemoryRouter>
        <HomeFaqs />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/from ₹/)).toBeFalsy()
  })

  it('links to the wholesale and export pages', () => {
    const { container } = render(
      <MemoryRouter>
        <HomeFaqs />
      </MemoryRouter>,
    )
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/wholesale')
    expect(hrefs).toContain('/hikma-exports')
  })
})
