import { describe, it, expect } from 'vitest'
import {
  calculateTargetDimensions,
  isCompressibleImage,
  compressProductImage,
} from './imageCompressor'

describe('imageCompressor utility', () => {
  describe('calculateTargetDimensions', () => {
    it('returns exact dimensions if already within bounds', () => {
      const { width, height } = calculateTargetDimensions(800, 600, 1400, 1400)
      expect(width).toBe(800)
      expect(height).toBe(600)
    })

    it('scales down landscape images preserving aspect ratio', () => {
      const { width, height } = calculateTargetDimensions(2800, 1400, 1400, 1400)
      expect(width).toBe(1400)
      expect(height).toBe(700)
    })

    it('scales down portrait images preserving aspect ratio', () => {
      const { width, height } = calculateTargetDimensions(1200, 2400, 1400, 1400)
      expect(width).toBe(700)
      expect(height).toBe(1400)
    })

    it('scales down square images correctly', () => {
      const { width, height } = calculateTargetDimensions(3000, 3000, 1400, 1400)
      expect(width).toBe(1400)
      expect(height).toBe(1400)
    })

    it('handles zero or negative inputs gracefully', () => {
      const { width, height } = calculateTargetDimensions(0, 0, 1400, 1400)
      expect(width).toBe(1400)
      expect(height).toBe(1400)
    })
  })

  describe('isCompressibleImage', () => {
    it('identifies standard photo formats as compressible', () => {
      expect(isCompressibleImage({ type: 'image/jpeg' })).toBe(true)
      expect(isCompressibleImage({ type: 'image/png' })).toBe(true)
      expect(isCompressibleImage({ type: 'image/webp' })).toBe(true)
    })

    it('excludes SVGs and GIFs to prevent destroying vectors or animations', () => {
      expect(isCompressibleImage({ type: 'image/svg+xml' })).toBe(false)
      expect(isCompressibleImage({ type: 'image/gif' })).toBe(false)
      expect(isCompressibleImage({ type: 'image/x-icon' })).toBe(false)
    })

    it('handles missing or non-image types safely', () => {
      expect(isCompressibleImage(null)).toBe(false)
      expect(isCompressibleImage({})).toBe(false)
      expect(isCompressibleImage({ type: 'application/pdf' })).toBe(false)
    })
  })

  describe('compressProductImage fallback handling', () => {
    it('returns null/undefined if input is null/undefined', async () => {
      const res = await compressProductImage(null)
      expect(res).toBe(null)
    })

    it('returns original file if not a compressible image', async () => {
      const fakeSvg = { name: 'icon.svg', type: 'image/svg+xml' }
      const res = await compressProductImage(fakeSvg)
      expect(res).toBe(fakeSvg)
    })
  })
})
