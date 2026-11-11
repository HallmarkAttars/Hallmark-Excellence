// @vitest-environment jsdom
//
// Guards the editorial guides dataset: unique slugs, unique SEO titles,
// complete sections/FAQs and internal related links. New guides must keep
// this green so the sitemap, /guides index and guide pages stay coherent.

import { describe, expect, it } from 'vitest'
import { GUIDES, getGuideBySlug } from './guides'

describe('guides dataset', () => {
  it('has unique slugs and unique SEO titles', () => {
    const slugs = new Set(GUIDES.map((g) => g.slug))
    expect(slugs.size).toBe(GUIDES.length)
    const titles = new Set(GUIDES.map((g) => g.seoTitle || g.title))
    expect(titles.size).toBe(GUIDES.length)
  })

  it('every guide is complete enough to publish', () => {
    for (const guide of GUIDES) {
      expect(guide.slug).toMatch(/^[a-z0-9-]+$/)
      expect(guide.title.length).toBeGreaterThan(10)
      expect(guide.description.length).toBeGreaterThanOrEqual(60)
      expect(guide.excerpt.length).toBeGreaterThanOrEqual(40)
      expect(guide.category).toBeTruthy()
      expect(guide.readTime).toBeTruthy()
      expect(guide.published).toBeTruthy()
      expect(guide.sections.length).toBeGreaterThanOrEqual(3)
      for (const section of guide.sections) {
        expect(section.heading.length).toBeGreaterThan(3)
        expect(section.paragraphs.length).toBeGreaterThanOrEqual(1)
      }
      expect(guide.faqs?.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('related links are internal', () => {
    for (const guide of GUIDES) {
      for (const link of guide.related || []) {
        expect(link.to.startsWith('/'), `${guide.slug}: ${link.to}`).toBe(true)
      }
      if (guide.shopCta) {
        expect(guide.shopCta.to.startsWith('/'), `${guide.slug}: shopCta`).toBe(true)
        expect(guide.shopCta.label.length).toBeGreaterThan(3)
      }
    }
  })

  it('resolves guides by slug and misses cleanly', () => {
    expect(getGuideBySlug('bakhoor-guide')?.slug).toBe('bakhoor-guide')
    expect(getGuideBySlug('nope')).toBeNull()
    expect(getGuideBySlug(null)).toBeNull()
  })

  it('targets bakhoor-perfume search intent on the bakhoor guide', () => {
    const guide = getGuideBySlug('bakhoor-guide')
    expect(guide.seoTitle).toContain('Bakhoor Perfume')
    expect(guide.description).toContain('benefits')
    expect(guide.shopCta).toEqual({
      label: 'Shop bakhoor perfume, chips & incense',
      to: '/categories/bakhoor',
    })
    expect(guide.description.length).toBeLessThanOrEqual(155)
    expect(guide.seoTitle.length).toBeLessThanOrEqual(60)
    expect(guide.sections.map((section) => section.heading)).toEqual(
      expect.arrayContaining(['Bakhoor Meaning and Common Spellings', 'Bakhoor Benefits: Why Homes Use It'])
    )
    const questions = guide.faqs.map((faq) => faq.question)
    expect(questions).toEqual(
      expect.arrayContaining(['What are the benefits of bakhoor?', 'What does bakhoor mean?'])
    )
  })

  it('publishes a 2027 wholesale sourcing guide for MOQ and export intent', () => {
    const guide = getGuideBySlug('wholesale-attar-sourcing-guide-2027')
    expect(guide).toBeTruthy()
    expect(guide.seoTitle).toContain('2027')
    expect(guide.description.toLowerCase()).toContain('moq')
    expect(guide.description.toLowerCase()).toContain('export')
    expect(guide.shopCta).toEqual({
      label: 'Request 2027 wholesale pricing',
      to: '/contact',
    })
    expect(guide.sections.map((section) => section.heading)).toEqual(
      expect.arrayContaining([
        'MOQs and Pack Sizes: 100g and 60 Pieces',
        'Export Documents and Chennai Logistics',
      ])
    )
  })
})
