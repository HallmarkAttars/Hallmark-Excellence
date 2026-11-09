// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import CatalogOutageNotice from './CatalogOutageNotice'
import { reportCatalogOffline, reportCatalogOnline } from '../../utils/catalogStatus'

afterEach(() => {
  cleanup()
  reportCatalogOnline()
})

describe('CatalogOutageNotice', () => {
  it('renders nothing while the catalogue is online', () => {
    const { container } = render(<CatalogOutageNotice />)
    expect(container.innerHTML).toBe('')
  })

  it('explains the outage and offers WhatsApp ordering when offline', () => {
    reportCatalogOffline(Date.UTC(2026, 10, 7))

    render(<CatalogOutageNotice />)

    expect(screen.getByRole('status').textContent).toMatch(
      /live catalogue is temporarily unavailable/i
    )
    expect(screen.getByRole('status').textContent).toMatch(
      /prices and stock may have changed/i
    )

    const whatsapp = screen.getByRole('link', { name: /order on whatsapp/i })
    expect(whatsapp.getAttribute('href')).toContain('wa.me/919840750467')

    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /\+91 98407 50467/ })).toBeTruthy()
  })
})
