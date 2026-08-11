// ============================================================================
// Code 39 (3-of-9) barcode encoder — zero dependencies, ADMIN ONLY.
//
// Used by the packing/shipping label so the Order ID prints as a REAL,
// scannable barcode (never a decorative black rectangle). The encoding is
// self-contained here: no fonts, no canvas, no external library — the same
// module feeds both the jsPDF vector renderer (label PDF) and the SVG
// renderer (print HTML), so both surfaces print an identical barcode.
//
// Code 39 facts (ISO/IEC 16388):
//   - Each character = 9 elements (5 bars + 4 spaces), exactly 3 wide.
//   - Elements are ordered bar, space, bar, space … bar.
//   - Wide : narrow ratio = 3 : 1 (the industry default for thermal labels).
//   - Characters are separated by one narrow inter-character gap.
//   - Quiet zones: 10 narrow units on each side (required for reliable scans).
//   - Self-checking symbology — no Mod 43 checksum is required for scanning,
//     and omitting it keeps the barcode content identical to the
//     human-readable Order ID printed beneath it.
// ============================================================================

// Nine-element patterns, left to right (bar/space/bar/…/bar), where '1' = wide
// and '0' = narrow. Verified against ISO/IEC 16388 reference tables; each
// pattern below has exactly three wide elements.
const PATTERNS = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  ' ': '011000100',
  '-': '010000101',
  '.': '110000100',
  $: '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100', // start / stop marker
}

const WIDE = 3 // wide element = 3 narrow units (3:1 ratio)
const NARROW = 1
const GAP = 1 // inter-character gap in narrow units
const QUIET = 10 // quiet zone on each side

// The character set Code 39 can encode (uppercase only). Anything else is
// stripped; an empty result falls back to 'ORDER' so the barcode is never
// empty and always scannable.
const ALLOWED = new Set(Object.keys(PATTERNS))

export function normalizeCode39(text) {
  const clean = String(text ?? '')
    .toUpperCase()
    .split('')
    .filter((ch) => ALLOWED.has(ch))
    .join('')
  return clean || 'ORDER'
}

// Encode text into alternating bar/space segments:
//   [{ bar: true, width: 3 }, { bar: false, width: 1 }, …]
// `width` is in narrow units. The returned array always starts and ends with
// a space (the quiet zones) and alternates bar/space throughout.
export function code39Modules(text) {
  const payload = normalizeCode39(text)
  const segments = []
  let isBar = false // quiet zone before the first bar

  const push = (width) => {
    const last = segments[segments.length - 1]
    if (last && last.bar === isBar) last.width += width
    else segments.push({ bar: isBar, width })
  }
  const pushChar = (ch) => {
    for (const w of PATTERNS[ch]) {
      push(w === '1' ? WIDE : NARROW)
      isBar = !isBar // each of the 9 elements alternates bar/space/bar/…
    }
  }

  push(QUIET)
  isBar = true
  pushChar('*')
  for (const ch of payload) {
    isBar = false
    push(GAP)
    isBar = true
    pushChar(ch)
  }
  isBar = false
  push(GAP)
  isBar = true
  pushChar('*')
  isBar = false
  push(QUIET)
  return segments
}

// Total encoded width in narrow units (includes quiet zones).
export function code39Width(text) {
  return code39Modules(text).reduce((sum, s) => sum + s.width, 0)
}

// jsPDF vector renderer. Draws filled bars starting at (x, y). The narrow
// width is auto-shrunk (never exceeded) when the natural width would spill
// past `maxWidth`. Returns the drawn width in the same units as the doc.
export function drawCode39(doc, text, x, y, { narrow = 0.25, height = 12, maxWidth = Infinity } = {}) {
  const modules = code39Modules(text)
  const total = modules.reduce((sum, s) => sum + s.width, 0)
  const unit = Math.min(narrow, (maxWidth || Infinity) / Math.max(1, total))
  let cx = x
  for (const m of modules) {
    if (m.bar) doc.rect(cx, y, m.width * unit, height, 'F')
    cx += m.width * unit
  }
  // Round to 2 decimals of the doc unit so the returned width is stable.
  return Math.round((cx - x) * 100) / 100
}

// SVG renderer for the print HTML — dimensions are in mm so the barcode
// prints at exactly the right physical size on a thermal label. `narrow` is
// the narrow-element width in mm; auto-shrunk to respect `maxWidth` (mm).
export function code39Svg(text, { narrow = 0.28, height = 12, maxWidth = Infinity } = {}) {
  const modules = code39Modules(text)
  const total = modules.reduce((sum, s) => sum + s.width, 0)
  const unit = Math.min(narrow, (maxWidth || Infinity) / Math.max(1, total))
  let cx = 0
  let bars = ''
  for (const m of modules) {
    if (m.bar) {
      bars += `<rect x="${cx.toFixed(3)}" y="0" width="${(m.width * unit).toFixed(3)}" height="${height}"/>`
    }
    cx += m.width * unit
  }
  const totalW = cx
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW.toFixed(3)}mm" height="${height}mm" viewBox="0 0 ${totalW} ${height}" shape-rendering="crispEdges" aria-hidden="true">${bars}</svg>`
}
