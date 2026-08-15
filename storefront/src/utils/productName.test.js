// Product-name display normalization — unit tests for
// storefront/src/utils/productName.js
//
// The storefront uses ONE shared ProductCard typography system (Cormorant
// Garamond via --font-display), but the catalog stores some names in ALL CAPS
// while Attar names are stored naturally. displayProductName makes every card
// render its name in the same natural case as the Attar cards WITHOUT touching
// the stored data: shouty names become title case, natural names pass through
// byte-for-byte.
//
// Run with:  npm test  (storefront)

import { describe, it, expect } from 'vitest'
import { displayProductName } from './productName'

describe('displayProductName — ALL-CAPS names match the Attar card look', () => {
  it('converts short all-caps names to title case', () => {
    expect(displayProductName('PEACH')).toBe('Peach')
    expect(displayProductName('NAZNEEN ')).toBe('Nazneen')
    expect(displayProductName('ENCHANTER')).toBe('Enchanter')
  })

  it('converts multi-word all-caps names to title case', () => {
    expect(displayProductName('VAMPIRE BLOOD ')).toBe('Vampire Blood')
    expect(displayProductName('TEA ROSE')).toBe('Tea Rose')
    expect(displayProductName('TOM FORD TOBACCO & VANILLA')).toBe('Tom Ford Tobacco & Vanilla')
    expect(displayProductName('HAWAS FOR HIM')).toBe('Hawas For Him')
    expect(displayProductName('ISSEY MIYAKE MEN')).toBe('Issey Miyake Men')
    expect(displayProductName('GOLDEN DUST')).toBe('Golden Dust')
    expect(displayProductName('CHOCOLATE CANDY ')).toBe('Chocolate Candy')
    expect(displayProductName('POLO BLACK ')).toBe('Polo Black')
    expect(displayProductName('OUDH 24')).toBe('Oudh 24')
    expect(displayProductName('OUDH MARACUJA GISSAH')).toBe('Oudh Maracuja Gissah')
    expect(displayProductName('OMBRE NOMADE LOUIS VUITTON')).toBe('Ombre Nomade Louis Vuitton')
  })

  it('keeps known acronyms and alphanumeric labels in their caps', () => {
    expect(displayProductName('SRK')).toBe('SRK')
    expect(displayProductName('YSL HOMME EU')).toBe('YSL Homme EU')
    expect(displayProductName('D & G LIGHT BLUE EU')).toBe('D & G Light Blue EU')
    expect(displayProductName('AFNAN 9AM')).toBe('Afnan 9AM')
    expect(displayProductName('AFNAN 9PM')).toBe('Afnan 9PM')
    expect(displayProductName('30ML VICTOR SPRAY BOTTLE ')).toBe('30ML Victor Spray Bottle')
  })

  it('keeps lowercase suffix tokens as stored ("iff" stays lowercase)', () => {
    expect(displayProductName('ZARA RED VANILLA iff')).toBe('Zara Red Vanilla iff')
    expect(displayProductName('ROSE VANILLA MANCERA iff')).toBe('Rose Vanilla Mancera iff')
    expect(displayProductName('ETERNITY MEN iff')).toBe('Eternity Men iff')
  })

  it('normalizes a hyphen touching a letter on one side ("X -MAN" → "X-Man")', () => {
    expect(displayProductName('X -MAN')).toBe('X-Man')
  })

  it('keeps spaced separator dashes between words', () => {
    expect(displayProductName('HUDSON VALLEY - GISSAH')).toBe('Hudson Valley - Gissah')
    expect(displayProductName('IMPERIAL VALLEY - GISSAH 1st')).toBe('Imperial Valley - Gissah 1st')
  })

  it('normalizes predominantly-uppercase names that contain some lowercase', () => {
    expect(displayProductName('SOLID SAPIL swiss Arabian ')).toBe('Solid Sapil swiss Arabian')
    expect(displayProductName('ASAD BOURBON by lattafa')).toBe('Asad Bourbon by lattafa')
    expect(displayProductName('ARMANI CODE elixir ')).toBe('Armani Code elixir')
  })
})

describe('displayProductName — Attar names are left byte-for-byte untouched', () => {
  it('keeps every naturally-stored Attar name identical', () => {
    expect(displayProductName('Own Main show')).toBe('Own Main show')
    expect(displayProductName('Chocolate Musk')).toBe('Chocolate Musk')
    expect(displayProductName('Sumaiya')).toBe('Sumaiya')
    expect(displayProductName('Cold Water')).toBe('Cold Water')
    expect(displayProductName('Royal Marriage')).toBe('Royal Marriage')
    expect(displayProductName('Sports Polo')).toBe('Sports Polo')
    expect(displayProductName('Cr7')).toBe('Cr7')
    expect(displayProductName('Pink Musk')).toBe('Pink Musk')
  })

  it('keeps mixed-case names with one capital letter unchanged', () => {
    expect(displayProductName('MUSK PURE Giv')).toBe('Musk Pure Giv')
    expect(displayProductName('D &G K giv')).toBe('D &G K giv')
  })
})

describe('displayProductName — defensive edge cases', () => {
  it('handles null / empty / whitespace-only input', () => {
    expect(displayProductName(null)).toBe('')
    expect(displayProductName(undefined)).toBe('')
    expect(displayProductName('')).toBe('')
    expect(displayProductName('   ')).toBe('')
  })

  it('returns names without letters unchanged', () => {
    expect(displayProductName('24')).toBe('24')
  })

  it('trims surrounding whitespace', () => {
    expect(displayProductName('  PEACH  ')).toBe('Peach')
  })
})
