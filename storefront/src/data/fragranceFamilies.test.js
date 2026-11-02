import { describe, it, expect } from 'vitest'
import {
  FAMILY_FILTERS,
  getFamilyLabel,
  getProductFamilies,
  isFragranceProduct,
  isValidFamilyParam,
} from './fragranceFamilies'

// Live catalogue category names (whitespace variants included, e.g. 'Bakhoor ').
const liveCategories = [
  ['Roll on Attars', 'perfume oil', 'Perfume Oils adjacent'],
  ['Fragrance Oil', 'perfume oil', 'Perfume Oils adjacent'],
  ['Bakhoor ', 'bakhoor', 'Bakhoor adjacent'],
]

const product = (name, description, category_name = 'Roll on Attars') => ({
  name,
  description,
  category_name,
})

describe('fragranceFamilies', () => {
  it("classifies by the product's own copy (rose -> floral)", () => {
    expect(getProductFamilies(product('Gulab Attar', 'A gentle rose and jasmine attar.'))).toEqual([
      'floral',
    ])
  })

  it('tags multiple families and returns them in canonical order', () => {
    const families = getProductFamilies(
      product('Oud Rose Attar', 'Saffron, oud chips, rose and a musky amber base with a sweet honey finish.')
    )
    const canonicalIndex = ['floral', 'musk', 'oud', 'woody', 'amber', 'sweet', 'fresh', 'oriental']
    const indexes = families.map((f) => canonicalIndex.indexOf(f))
    expect(families.length).toBeGreaterThan(2)
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes)
  })

  it('matches whole words only ("season" never triggers the "sea" fresh keyword)', () => {
    expect(
      getProductFamilies(product('Everyday Attar', 'A fresh companion for every season at the market.'))
    ).toEqual(['fresh'])
  })

  it('never classifies packaging, display or cosmetic products', () => {
    expect(getProductFamilies(product('6ML Roll-On Bottle', 'Scented glass bottle for fragrance blends and attar oils.', 'Roll on Bottles'))).toEqual([])
    expect(getProductFamilies(product('Caps for Roll on bottles', 'Screw caps for bottles.', 'Caps'))).toEqual([])
    expect(getProductFamilies(product('Arees Face Wash', 'Deep cleansing, fresh feel.', 'Arees Face Wash'))).toEqual([])
    // DPG carrier: explicitly a dilution base, never a family.
    expect(getProductFamilies(product('DPG', 'Dipropylene glycol carrier for dilution.', 'Fragrance Oil'))).toEqual([])
  })

  it('accepts live category-name variants (trailing spaces, plural forms)', () => {
    expect(isFragranceProduct(product('Bakhoor Chips', 'Natural wood chips for bakhoor burners.', 'Bakhoor '))).toBe(true)
    expect(isFragranceProduct(product('Perfume Oil', 'Concentrated oil.', 'Fragrance Oil'))).toBe(true)
  })

  it('exposes filter options in the { id, name } shape FilterSortControl needs', () => {
    expect(FAMILY_FILTERS.length).toBe(8)
    for (const option of FAMILY_FILTERS) {
      expect(typeof option.id).toBe('string')
      expect(typeof option.name).toBe('string')
      expect(option.name.length).toBeGreaterThan(1)
    }
    expect(new Set(FAMILY_FILTERS.map((o) => o.id)).size).toBe(FAMILY_FILTERS.length)
  })

  it('validates deep-link params strictly', () => {
    expect(isValidFamilyParam('musk')).toBe(true)
    expect(isValidFamilyParam(' flute')).toBe(false)
    expect(isValidFamilyParam(null)).toBe(false)
  })

  it('labels known families and never crashes on unknown values', () => {
    expect(getFamilyLabel('oud')).toBe('Oud')
    expect(getFamilyLabel(undefined)).toBe('')
    expect(typeof getFamilyLabel('unknown')).toBe('string')
  })
})
