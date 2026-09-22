// Admin variant validation — unit tests for admin/src/utils/variantValidation.js
//
// Covers the 4-field variant rules: Quantity > 0, Unit ∈ {ML, Gram, Pieces},
// Variant Total Price >= 0, Price Per Unit >= 0, exactly one default, no
// duplicate quantity+unit pairs.
//
// Run with:  npm test  (admin)

import { describe, it, expect } from 'vitest'
import { UNIT_OPTIONS, defaultVariantOf, normalizeUnit, perUnitDisplay, perUnitLabel, validateVariants } from './variantValidation'

// Valid baseline variant (matching the acceptance-test Testers product).
const variant = (overrides = {}) => ({
  quantity_value: '100',
  quantity_unit: 'Pieces',
  total_price: '1000',
  price_per_unit: '10',
  is_default: false,
  ...overrides,
})

describe('validateVariants — the 4-field variant rules', () => {
  it('accepts an empty variant list (variants are optional)', () => {
    expect(validateVariants([])).toBe('')
    expect(validateVariants(undefined)).toBe('')
    expect(validateVariants(null)).toBe('')
  })

  it('accepts the acceptance-test product variants', () => {
    const variants = [
      variant({ is_default: true }),                                    // 100 Pieces → ₹1000 / ₹10
      variant({ quantity_value: '250', total_price: '2250', price_per_unit: '9' }),
      variant({ quantity_value: '500', total_price: '4000', price_per_unit: '8' }),
      variant({ quantity_value: '1000', total_price: '7500', price_per_unit: '7.50' }),
    ]
    expect(validateVariants(variants)).toBe('')
  })

  it('rejects zero or multiple default variants', () => {
    expect(validateVariants([variant()])).toMatch(/Exactly one variant/)
    const twoDefaults = [
      variant({ is_default: true }),
      variant({ quantity_value: '250', is_default: true }),
    ]
    expect(validateVariants(twoDefaults)).toMatch(/Exactly one variant/)
  })

  it('rejects a missing quantity or unit', () => {
    expect(validateVariants([variant({ quantity_value: '', is_default: true })])).toMatch(/Quantity and Unit/)
    expect(validateVariants([variant({ quantity_unit: '', is_default: true })])).toMatch(/Quantity and Unit/)
  })

  it('rejects quantity <= 0 and non-numeric quantity', () => {
    expect(validateVariants([variant({ quantity_value: '0', is_default: true })])).toMatch(/greater than 0/)
    expect(validateVariants([variant({ quantity_value: '-5', is_default: true })])).toMatch(/greater than 0/)
    expect(validateVariants([variant({ quantity_value: 'abc', is_default: true })])).toMatch(/greater than 0/)
  })

  it('rejects a unit outside ML, Gram, Pieces', () => {
    expect(validateVariants([variant({ quantity_unit: 'KG', is_default: true })])).toMatch(/ML, Gram or Pieces/)
    // "GM" must be canonicalized to "Gram" on load; an unconverted "GM" is invalid.
    expect(validateVariants([variant({ quantity_unit: 'GM', is_default: true })])).toMatch(/ML, Gram or Pieces/)
  })

  it('accepts each of the three standard units', () => {
    for (const unit of UNIT_OPTIONS) {
      expect(validateVariants([variant({ quantity_unit: unit, is_default: true })])).toBe('')
    }
  })

  it('rejects an empty variant total price', () => {
    expect(validateVariants([variant({ total_price: '', is_default: true })])).toMatch(/Variant Total Price/)
  })

  it('rejects a negative variant total price but accepts 0 (>= 0 rule)', () => {
    expect(validateVariants([variant({ total_price: '-1', is_default: true })])).toMatch(/Variant Total Price/)
    expect(validateVariants([variant({ total_price: '0', is_default: true })])).toBe('')
  })

  it('rejects an empty or negative price per unit', () => {
    expect(validateVariants([variant({ price_per_unit: '', is_default: true })])).toMatch(/Price Per Unit/)
    expect(validateVariants([variant({ price_per_unit: '-0.01', is_default: true })])).toMatch(/Price Per Unit/)
  })

  it('rejects duplicate quantity + unit combinations', () => {
    const variants = [
      variant({ is_default: true }),
      variant({ total_price: '2250' }), // same 100 Pieces → duplicate
    ]
    expect(validateVariants(variants)).toMatch(/Duplicate variant/)
  })

  it('allows the same quantity with different units', () => {
    const variants = [
      variant({ quantity_unit: 'Pieces', is_default: true }),
      variant({ quantity_unit: 'Gram' }),
    ]
    expect(validateVariants(variants)).toBe('')
  })
})

describe('normalizeUnit — legacy units canonicalized', () => {
  it('maps common aliases to the three standards', () => {
    expect(normalizeUnit('ML')).toBe('ML')
    expect(normalizeUnit('ml')).toBe('ML')
    expect(normalizeUnit('MLS')).toBe('ML')
    expect(normalizeUnit('Gram')).toBe('Gram')
    expect(normalizeUnit('GM')).toBe('Gram')
    expect(normalizeUnit('gms')).toBe('Gram')
    expect(normalizeUnit('Pieces')).toBe('Pieces')
    expect(normalizeUnit('pcs')).toBe('Pieces')
    expect(normalizeUnit('pc')).toBe('Pieces')
  })

  it('defaults missing units to ML', () => {
    expect(normalizeUnit('')).toBe('ML')
    expect(normalizeUnit(null)).toBe('ML')
    expect(normalizeUnit(undefined)).toBe('ML')
  })

  it('preserves truly unknown units as-is', () => {
    expect(normalizeUnit('Bottle')).toBe('Bottle')
    expect(normalizeUnit('  Pack  ')).toBe('Pack')
  })
})

describe('perUnitLabel — the "/ unit" suffix for per-unit price displays', () => {
  it('maps the three standard units to their singular display forms', () => {
    expect(perUnitLabel('Pieces')).toBe('piece')
    expect(perUnitLabel('ML')).toBe('ml')
    expect(perUnitLabel('Gram')).toBe('gram')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(perUnitLabel('PIECES')).toBe('piece')
    expect(perUnitLabel('  pieces  ')).toBe('piece')
    expect(perUnitLabel('ml')).toBe('ml')
    expect(perUnitLabel('GRAM')).toBe('gram')
  })

  it('falls back to the lowercased unit for unknown units (never "/ piece")', () => {
    expect(perUnitLabel('Bottle')).toBe('bottle')
    expect(perUnitLabel('GM')).toBe('gm')
  })

  it('never returns an empty string', () => {
    expect(perUnitLabel('')).toBe('unit')
    expect(perUnitLabel(null)).toBe('unit')
    expect(perUnitLabel(undefined)).toBe('unit')
  })
})

describe('defaultVariantOf / perUnitDisplay — the PRICE column source', () => {
  const product = (variants) => ({ id: 'p1', price: 999, variants })
  const v = (overrides = {}) => ({
    quantity_value: 100, quantity_unit: 'Pieces',
    total_price: 2700, price_per_unit: 45,
    is_default: false,
    ...overrides,
  })

  it('prefers the is_default variant over the first one', () => {
    const p = product([v({ quantity_value: 60, price_per_unit: 45, is_default: true }), v({ quantity_value: 100, price_per_unit: 42 })])
    expect(defaultVariantOf(p).quantity_value).toBe(60)
  })

  it('falls back to the first variant when none is flagged default', () => {
    expect(defaultVariantOf(product([v(), v()])).quantity_value).toBe(100)
  })

  it('returns null for products without variants (caller falls back to product.price)', () => {
    expect(defaultVariantOf(product([]))).toBeNull()
    expect(defaultVariantOf(product(null))).toBeNull()
    expect(defaultVariantOf({})).toBeNull()
  })

  it('builds the per-unit display from the DEFAULT variant, not the total', () => {
    const p = product([v({ quantity_value: 60, total_price: 2700, price_per_unit: 45, is_default: true })])
    expect(perUnitDisplay(p)).toEqual({ perUnit: 45, unitLabel: 'piece' })
  })

  it('keeps a legit 0 per-unit price (nullish, not falsy)', () => {
    const p = product([v({ price_per_unit: 0, is_default: true })])
    expect(perUnitDisplay(p).perUnit).toBe(0)
  })

  it('falls back to the legacy price when price_per_unit is missing', () => {
    const legacy = { quantity_value: 60, quantity_unit: 'ML', price: 300, is_default: true }
    expect(perUnitDisplay(product([legacy]))).toEqual({ perUnit: 300, unitLabel: 'ml' })
  })

  it('returns null (no variants) so variant-less products keep product.price', () => {
    expect(perUnitDisplay(product([]))).toBeNull()
  })
})
