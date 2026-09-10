import { describe, expect, it } from 'vitest'
import {
  isBrandProduct,
  isCategoryRequired,
  getCategoryLabel,
  validateProductCategory,
} from './productValidation'

describe('productValidation — Category requirement & Brand relationship', () => {
  describe('isBrandProduct', () => {
    it('returns true when a brandId is selected', () => {
      expect(isBrandProduct({ brandId: 'b1' })).toBe(true)
    })

    it('returns true when brand is locked via lockedBrandId', () => {
      expect(isBrandProduct({ lockedBrandId: 'b2' })).toBe(true)
      expect(isBrandProduct({ brandId: 'b2', lockedBrandId: 'b2' })).toBe(true)
    })

    it('returns false when neither brandId nor lockedBrandId is present', () => {
      expect(isBrandProduct({ brandId: '', lockedBrandId: null })).toBe(false)
      expect(isBrandProduct({ brandId: null, lockedBrandId: undefined })).toBe(false)
      expect(isBrandProduct({})).toBe(false)
    })
  })

  describe('isCategoryRequired', () => {
    it('is optional (false) when creating a brand product with selected brand', () => {
      expect(isCategoryRequired({ brandId: 'b1' })).toBe(false)
    })

    it('is optional (false) when creating a brand-locked product', () => {
      expect(isCategoryRequired({ lockedBrandId: 'b2' })).toBe(false)
    })

    it('is required (true) when creating a normal non-brand product', () => {
      expect(isCategoryRequired({ brandId: '', lockedBrandId: null })).toBe(true)
      expect(isCategoryRequired({})).toBe(true)
    })
  })

  describe('getCategoryLabel', () => {
    it('displays "Category (optional)" when brand is selected or locked', () => {
      expect(getCategoryLabel({ brandId: 'b1' })).toBe('Category (optional)')
      expect(getCategoryLabel({ lockedBrandId: 'b2' })).toBe('Category (optional)')
      expect(getCategoryLabel({ brandId: 'b2', lockedBrandId: 'b2' })).toBe('Category (optional)')
    })

    it('displays "Category" without red "*" or (optional) when no brand is selected', () => {
      expect(getCategoryLabel({ brandId: '' })).toBe('Category')
      expect(getCategoryLabel({})).toBe('Category')
    })
  })

  describe('validateProductCategory', () => {
    it('succeeds (null) for brand product with no category', () => {
      expect(validateProductCategory({ categoryId: '', brandId: 'b1' })).toBeNull()
      expect(validateProductCategory({ categoryId: null, brandId: 'b1' })).toBeNull()
    })

    it('succeeds (null) for brand product with category', () => {
      expect(validateProductCategory({ categoryId: 'c1', brandId: 'b1' })).toBeNull()
    })

    it('succeeds (null) for brand-locked product with no category', () => {
      expect(validateProductCategory({ categoryId: '', lockedBrandId: 'b2' })).toBeNull()
      expect(validateProductCategory({ categoryId: null, lockedBrandId: 'b2' })).toBeNull()
    })

    it('succeeds (null) for normal product with category', () => {
      expect(validateProductCategory({ categoryId: 'c1', brandId: '' })).toBeNull()
      expect(validateProductCategory({ categoryId: 'c1', brandId: null })).toBeNull()
    })

    it('fails with error for normal product without category', () => {
      expect(validateProductCategory({ categoryId: '', brandId: '' })).toBe('Please select a category.')
      expect(validateProductCategory({ categoryId: null, brandId: null })).toBe('Please select a category.')
      expect(validateProductCategory({})).toBe('Please select a category.')
    })
  })
})
