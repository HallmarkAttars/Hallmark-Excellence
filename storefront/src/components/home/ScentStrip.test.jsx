// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ScentStrip from './ScentStrip'
import { FAMILY_FILTERS } from '../../data/fragranceFamilies'

afterEach(() => cleanup())

const renderStrip = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ScentStrip />
    </MemoryRouter>
  )

describe('ScentStrip', () => {
  it('renders eyebrow, title and the All chip plus every family chip', () => {
    const { container } = renderStrip()

    expect(screen.getByText('Discover Your Fragrance')).toBeTruthy()
    expect(screen.getByText('Explore by Fragrance Family')).toBeTruthy()
    expect(screen.getByText('All Fragrances')).toBeTruthy()

    const chips = [...container.querySelectorAll('.scent-chip')]
    expect(chips).toHaveLength(FAMILY_FILTERS.length + 1)
    for (const family of FAMILY_FILTERS) {
      expect(screen.getByText(family.name)).toBeTruthy()
    }
  })

  it('keeps the strip minimal — no subtitle paragraph', () => {
    const { container } = renderStrip()
    expect(screen.queryByText(/Not sure where to begin/i)).toBeNull()
    expect(container.querySelector('.section-subtitle')).toBeNull()
  })

  it('marks All Fragrances active when there is no ?family= param', () => {
    const { container } = renderStrip('/')

    const all = container.querySelector('.scent-chip--all')
    expect(all.className).toContain('scent-chip--active')
    expect(container.querySelectorAll('.scent-chip--active')).toHaveLength(1)
  })

  it('marks the matching family chip active for /?family=oud', () => {
    const { container } = renderStrip('/?family=oud')

    const active = [...container.querySelectorAll('.scent-chip--active')]
    expect(active).toHaveLength(1)
    expect(active[0].textContent).toBe('Oud')
    expect(container.querySelector('.scent-chip--all').className).not.toContain(
      'scent-chip--active'
    )
  })

  it('links every family deep into the Shop family filter', () => {
    const { container } = renderStrip()

    const links = [...container.querySelectorAll('.scent-chip')]
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/shop')
    for (const family of FAMILY_FILTERS) {
      expect(hrefs).toContain(`/shop?family=${family.id}`)
    }
  })
})
