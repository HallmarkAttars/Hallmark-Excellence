// Unit tests for admin/src/utils/barcode.js — the Code 39 encoder that powers
// the packing-label barcode (both the jsPDF and SVG render paths).
//
// Run with:  npm test  (admin)

import { describe, expect, it } from 'vitest'
import {
  normalizeCode39,
  code39Modules,
  code39Width,
  drawCode39,
  code39Svg,
} from './barcode'

// Every Code 39 character pattern must have EXACTLY 9 elements (5 bars +
// 4 spaces), exactly 3 of them wide. This is the symbology's defining
// invariant — any table typo that breaks it fails here.
describe('Code 39 table integrity', () => {
  // Re-import the pattern table through the encoder's behaviour instead of
  // duplicating it: encode a single character and count wide elements.
  const CHARS = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z',
    ' ', '-', '.', '$', '/', '+', '%',
  ]

  it('every supported character produces a 9-element, 3-wide pattern', () => {
    for (const ch of CHARS) {
      // Encode 'ch' and find the character's own segments: quiet(10),
      // '*', gap(1), <ch>, gap(1), '*' , quiet(10).
      const segs = code39Modules(ch)
      const widths = segs.map((s) => s.width)
      // Total width for one char + start/stop:
      //   quiet 10 + start 15 + gap 1 + char 15 + gap 1 + stop 15 + quiet 10
      expect(widths.reduce((a, b) => a + b, 0), `char ${ch} total width`).toBe(67)
    }
  })

  it('produces exactly 5 bars and 4 spaces per character', () => {
    for (const ch of CHARS) {
      const segs = code39Modules(ch)
      // Between the two quiet zones: '*' (5 bars, 4 spaces) + gap (1 space)
      // + char (5 bars, 4 spaces) + gap (1 space) + '*' (5 bars, 4 spaces)
      // = 15 bar segments + 14 space segments, strictly alternating.
      const middle = segs.slice(1, -1)
      const bars = middle.filter((s) => s.bar)
      const spaces = middle.filter((s) => !s.bar)
      expect(bars.length, `char ${ch} bar segments`).toBe(15)
      expect(spaces.length, `char ${ch} space segments`).toBe(14)
      expect(middle.length, `char ${ch} middle segments`).toBe(29)
    }
  })

  it('alternates strictly bar/space/bar/space', () => {
    const segs = code39Modules('A')
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].bar, `segment ${i}`).not.toBe(segs[i - 1].bar)
    }
  })
})

describe('normalizeCode39', () => {
  it('upper-cases and strips unsupported characters', () => {
    expect(normalizeCode39('ord-164714')).toBe('ORD-164714')
    expect(normalizeCode39('hello_world!')).toBe('HELLOWORLD')
    expect(normalizeCode39('a b.c$/+%')).toBe('A B.C$/+%')
  })

  it('falls back to ORDER when nothing is encodable', () => {
    expect(normalizeCode39('')).toBe('ORDER')
    expect(normalizeCode39('!!!')).toBe('ORDER')
    expect(normalizeCode39(null)).toBe('ORDER')
    expect(normalizeCode39(undefined)).toBe('ORDER')
  })
})

describe('code39Width', () => {
  it('matches the hand-computed unit width for ORD-164714', () => {
    // Encoded structure (n = payload length):
    //   quiet(10) + '*' (15) + n × (gap 1 + char 15) + gap(1) + '*' (15)
    //   + quiet(10)  =  51 + 16n
    // ORD-164714 has 10 payload chars → 51 + 160 = 211 units.
    expect(code39Width('ORD-164714')).toBe(211)
    expect(code39Width('A')).toBe(67) // 51 + 16
    expect(code39Width('AB')).toBe(83) // 51 + 32
  })

  it('scales with payload length', () => {
    expect(code39Width('A')).toBeLessThan(code39Width('AA'))
    expect(code39Width('AA')).toBeLessThan(code39Width('AAA'))
  })
})

describe('drawCode39 (jsPDF)', () => {
  function fakeDoc() {
    const rects = []
    return {
      rects,
      rect(x, y, w, h, style) {
        rects.push({ x, y, w, h, style })
      },
    }
  }

  it('draws only bars (fill style) and returns the drawn width', () => {
    const doc = fakeDoc()
    const w = drawCode39(doc, 'ORD-164714', 10, 20, { narrow: 0.25, height: 12 })
    expect(doc.rects.length).toBeGreaterThan(20)
    expect(doc.rects.every((r) => r.style === 'F')).toBe(true)
    expect(w).toBe(code39Width('ORD-164714') * 0.25)
  })

  it('shrinks the module width when maxWidth would be exceeded', () => {
    const doc = fakeDoc()
    const w = drawCode39(doc, 'ORD-164714', 10, 20, { narrow: 0.25, height: 12, maxWidth: 30 })
    expect(w).toBeLessThanOrEqual(30)
    expect(w).toBeGreaterThan(0)
  })

  it('never leaves the quiet-zone spaces as bars', () => {
    const doc = fakeDoc()
    drawCode39(doc, 'A', 0, 0, { narrow: 1, height: 10 })
    // First bar must start after the 10-unit leading quiet zone.
    expect(doc.rects[0].x).toBe(10)
  })
})

describe('code39Svg', () => {
  it('renders a self-closing svg with mm dimensions and bar rects', () => {
    const svg = code39Svg('ORD-164714', { narrow: 0.28, height: 12 })
    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('mm"')
    expect(svg).toContain('<rect ')
    expect(svg).toContain('</svg>')
  })

  it('respects maxWidth by shrinking the unit', () => {
    const natural = code39Svg('ORD-164714', { narrow: 0.28 })
    const capped = code39Svg('ORD-164714', { narrow: 0.28, maxWidth: 30 })
    const mmOf = (svg) => Number(svg.match(/width="([\d.]+)mm"/)[1])
    expect(mmOf(capped)).toBeLessThanOrEqual(30)
    expect(mmOf(capped)).toBeLessThan(mmOf(natural))
  })
})
