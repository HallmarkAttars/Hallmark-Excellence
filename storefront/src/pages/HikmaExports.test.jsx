// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HikmaExports from './HikmaExports'

describe('HikmaExports page', () => {
  afterEach(() => cleanup())

  it('renders the entity heading, wholesale links, and FAQs', () => {
    render(
      <MemoryRouter>
        <HikmaExports />
      </MemoryRouter>
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Hikma Exports: Perfume Wholesaler & Exporter in Chennai/i,
      })
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: /Wholesale Enquiry/i }).getAttribute('href')).toBe('/wholesale')
    expect(screen.getByRole('heading', { name: /Hikma Exports FAQs/i })).toBeTruthy()
    expect(screen.getByText('100g - 10kg')).toBeTruthy()
    expect(screen.getByText('Minimum 60 pieces')).toBeTruthy()
    expect(screen.getByText('GST-registered business with IEC')).toBeTruthy()
  })
})
