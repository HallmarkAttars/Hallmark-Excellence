// @vitest-environment jsdom
//
// Guards the editorial category copy (categoryContent.js):
//   - all 10 live catalogue category names resolve to an entry
//   - meta descriptions fit after the optional "Prices from ₹X." suffix
//   - every entry carries an intro + at least two sections
//   - every related link starts with '/' (internal)

import { describe, expect, it } from 'vitest'
import { CATEGORY_CONTENT, getCategoryContent } from './categoryContent'

// Live category names straight from the public API (Nov 2026), including the
// quirky punctuation. Lookup must trim/case-normalize: several DB slugs and
// names carry trailing spaces.
const LIVE_CATEGORY_NAMES = [
  'Bakhoor ',
  'Roll on Attars',
  'Fragrance Oil',
  'Roll on Bottles',
  'Fancy Bottle',
  'Caps for Roll on bottles ',
  'Spray Bottles',
  'Pump & Cap for spray bottles ',
  'Canter Bottle',
  'Arees Face Wash',
]

// The category whose DB SLUG is 'Display bottles ' carries the clean
// category NAME 'Canter Bottle' - name-keyed lookup must still resolve it.
const DISPLAY_BOTTLES_RECORD = { name: 'Canter Bottle', slug: 'Display bottles ' }

const CANONICAL_NAMES = [
  'Bakhoor',
  'Roll on Attars',
  'Fragrance Oil',
  'Roll on Bottles',
  'Fancy Bottle',
  'Caps for Roll on bottles',
  'Spray Bottles',
  'Pump & Cap for spray bottles',
  'Canter Bottle',
  'Arees Face Wash',
]

describe('categoryContent', () => {
  it('has an entry for every live catalogue category (by name)', () => {
    for (const name of LIVE_CATEGORY_NAMES) {
      expect(getCategoryContent({ name }), `missing editorial for: ${name}`).not.toBeNull()
    }
    expect(Object.keys(CATEGORY_CONTENT)).toHaveLength(CANONICAL_NAMES.length)
  })

  it('unknown category names return null and keep caller behaviour', () => {
    expect(getCategoryContent({ name: 'Something New' })).toBeNull()
    expect(getCategoryContent(null)).toBeNull()
    expect(getCategoryContent({})).toBeNull()
  })

  it('entries are complete: intro, 2+ sections with paragraphs', () => {
    for (const [key, entry] of Object.entries(CATEGORY_CONTENT)) {
      expect(String(entry.intro).length, `${key}: intro too short`).toBeGreaterThanOrEqual(40)
      expect(entry.sections.length, `${key}: needs 2+ sections`).toBeGreaterThanOrEqual(2)
      for (const section of entry.sections) {
        expect(section.heading.length).toBeGreaterThan(3)
        expect(section.paragraphs.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('meta descriptions stay under 160 chars including the price suffix', () => {
    // renderFaqs-style suffix appended by buildCategorySeo for retail
    // categories: " Prices from ₹220." (longest realistic example).
    const suffix = ' Prices from ₹220.'
    for (const [key, entry] of Object.entries(CATEGORY_CONTENT)) {
      if (!entry.metaDescription) continue
      const total = entry.metaDescription.length + suffix.length
      expect(total, `${key}: meta description ${total} chars`).toBeLessThanOrEqual(160)
    }
  })

  it('targets the bakhoor commercial queries on the category page', () => {
    const entry = getCategoryContent({ name: 'Bakhoor ' })
    expect(entry.title).toContain('Bakhoor Perfume')
    expect(entry.title).toContain('Attar')
    expect(entry.metaDescription.toLowerCase()).toContain('bakhoor perfume')
    expect(entry.metaDescription.toLowerCase()).toContain('bakhoor attar')
    expect(entry.intro.toLowerCase()).toContain('bakhoor perfume')
    expect(entry.intro.toLowerCase()).toContain('bakhoor attar')
  })

  it('canonical category names map consistently between slug and key', () => {
    // Every canonical name must be derivable from the live name by just
    // trim + lowercase (this is what getCategoryContent does).
    for (let i = 0; i < LIVE_CATEGORY_NAMES.length; i += 1) {
      const key = LIVE_CATEGORY_NAMES[i].trim().toLowerCase()
      const entry = getCategoryContent({ name: LIVE_CATEGORY_NAMES[i] })
      expect(entry, `${LIVE_CATEGORY_NAMES[i]} -> ${key}`).toBe(
        CATEGORY_CONTENT[key] || null,
      )
      // 'Display bottles ' slug with clean name 'Canter Bottle' maps to the
      // canter bottle editorial
      if (LIVE_CATEGORY_NAMES[i] === 'Canter Bottle') {
        expect(getCategoryContent(DISPLAY_BOTTLES_RECORD)).toBe(CATEGORY_CONTENT['canter bottle'])
      }
    }
    // Belt-and-braces: the canonical name itself also resolves.
    for (const name of CANONICAL_NAMES) {
      expect(getCategoryContent({ name })).not.toBeNull()
    }
  })

  it('related guides are internal links only', () => {
    for (const [key, entry] of Object.entries(CATEGORY_CONTENT)) {
      for (const link of entry.relatedGuides || []) {
        expect(link.to.startsWith('/'), `${key}: ${link.to} must be internal`).toBe(true)
        expect(link.label.length).toBeGreaterThan(3)
      }
    }
  })
})
