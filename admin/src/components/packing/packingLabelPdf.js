// ============================================================================
// Packing / shipping label — compact 4" × 6" thermal label (PDF + print).
// ADMIN ONLY. One label per order, each on its own page, for pasting onto
// the parcel.
//
// Carries ONLY packing/delivery data: Order ID (as text + a real Code 39
// barcode), Customer, Mobile, wrapped Delivery Address. No prices, no
// payment, no email, no internal info.
//
// Reuses the same jsPDF stack as the invoice generator plus the zero-
// dependency Code 39 encoder in utils/barcode.js (no new dependency, and the
// barcode is real — never a decorative black rectangle).
//
// Sheet: 4 × 6 inch = 101.6 × 152.4 mm (portrait), the standard thermal
// shipping-label size. The label fills the printable area: no giant A4 page,
// no wasted vertical space, no clipping — content flows from the top and is
// capped before the fixed bottom barcode band.
// ============================================================================

import { jsPDF } from 'jspdf'
import { packingLabelData, packingLabelFileName } from '../../utils/packing'
import { code39Svg, drawCode39, code39Modules } from '../../utils/barcode'

// Palette — HIKMAEXPORTS premium branding.
const INK = [23, 21, 18]        // #171512 — near-black for headings
const TEXT = [26, 24, 21]       // #1A1815 — body text
const GOLD = [184, 134, 43]     // #B8862B — gold accent
const HAIRLINE = [230, 224, 208] // #E6E0D0 — light divider

// Sheet size — 4" × 6" portrait, mm.
const W = 101.6
const H = 152.4
const M = 6 // outer margin
const CX = W / 2
const INNER_W = W - M * 2

// FROM address — hardcoded per brand spec.
const FROM_ADDRESS = [
  'HIKMAEXPORTS',
  '83 & 84, Moore St,',
  'Mannadi, George Town,',
  'Chennai, Greater Chennai,',
  'Tamil Nadu 600001',
]

// Fixed lower band — the barcode must never collide with content.
const BARCODE_RULE_Y = 88
const BARCODE_Y = 94
const BARCODE_H = 12
const BARCODE_TEXT_Y = BARCODE_Y + BARCODE_H + 5 // 111

// Footer positions.
const PACKED_CARE_Y = 124
const BOTTOM_RULE_Y = 138
const THANK_YOU_Y = 145

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// PDF helper — draw a small gold diamond ornament at (cx, cy).
// ---------------------------------------------------------------------------
function drawDiamond(doc, cx, cy, size, gold) {
  doc.setFillColor(...gold)
  doc.triangle(cx, cy - size, cx + size, cy, cx, cy + size, 'F')
  doc.triangle(cx, cy - size, cx - size, cy, cx, cy + size, 'F')
}

// ---------------------------------------------------------------------------
// PDF helpers — small icons for the FROM / SHIP TO columns.
// ---------------------------------------------------------------------------
function drawBuildingIcon(doc, x, y, s, gold) {
  doc.setFillColor(...gold)
  doc.rect(x, y, s, s * 1.3, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(x + s * 0.15, y + s * 0.7, s * 0.3, s * 0.5, 'F')
  doc.rect(x + s * 0.55, y + s * 0.2, s * 0.3, s * 0.35, 'F')
}

function drawPersonIcon(doc, x, y, s, gold) {
  doc.setFillColor(...gold)
  doc.circle(x + s / 2, y + s * 0.35, s * 0.28, 'F')
  doc.triangle(x, y + s * 0.75, x + s, y + s * 0.75, x + s / 2, y + s * 1.4, 'F')
}

function drawPhoneIcon(doc, x, y, s, gold) {
  doc.setFillColor(...gold)
  doc.roundedRect(x + s * 0.2, y, s * 0.6, s, 0.3, 0.3, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(x + s * 0.32, y + s * 0.12, s * 0.36, s * 0.18, 'F')
  doc.rect(x + s * 0.32, y + s * 0.7, s * 0.36, s * 0.18, 'F')
}

function drawLocationIcon(doc, x, y, s, gold) {
  doc.setFillColor(...gold)
  doc.circle(x + s / 2, y + s * 0.3, s * 0.32, 'F')
  doc.triangle(x + s * 0.2, y + s * 0.5, x + s * 0.8, y + s * 0.5, x + s / 2, y + s * 1.1, 'F')
  doc.setFillColor(255, 255, 255)
  doc.circle(x + s / 2, y + s * 0.3, s * 0.14, 'F')
}

// ---------------------------------------------------------------------------
// PDF page — vector label (no HTML rendering, no font embedding needed).
// ---------------------------------------------------------------------------
function drawLabel(doc, data) {
  const ink = INK.map((v) => v / 255)
  const text = TEXT.map((v) => v / 255)
  const gold = GOLD.map((v) => v / 255)
  const hairline = HAIRLINE.map((v) => v / 255)

  const rule = (y, width = 0.4, color = gold) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(width)
    doc.line(M, y, W - M, y)
  }

  const fieldLabel = (label, x, y) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.6)
    doc.setCharSpace(1.6)
    doc.setTextColor(...gold)
    doc.text(label.toUpperCase(), x, y)
    doc.setCharSpace(0)
  }

  // Safe left-aligned text: ensures charSpace is always 0 after the call.
  const leftText = (str, x, y, opts = {}) => {
    doc.setCharSpace(0)
    doc.text(str, x, y, opts)
  }

  // ---- Header -----------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...ink)
  doc.text('HIKMAEXPORTS', CX, 10, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5)
  doc.setCharSpace(0.8)
  doc.setTextColor(...gold)
  doc.text('PACKING / SHIPPING LABEL', CX, 14.5, { align: 'center' })
  doc.setCharSpace(0)

  // Gold rule with diamond ornament
  rule(17)
  drawDiamond(doc, CX, 17, 1.2, gold)

  // ---- ORDER ID ---------------------------------------------------------
  let y = 23
  fieldLabel('ORDER ID', M, y)
  y += 6

  const id = String(data.orderId || '—')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...text)
  doc.text(id, M, y)
  y += 8

  // ---- FROM / SHIP TO BOX -----------------------------------------------
  const boxTop = y
  const boxBottom = BARCODE_RULE_Y - 6
  const boxLeft = M
  const boxRight = W - M
  const boxW = boxRight - boxLeft
  const boxH = boxBottom - boxTop

  // Gold border — draw as four stroked lines for maximum PDF-reader compat.
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.5)
  const r = 1.5 // corner radius mm
  // Top edge
  doc.line(boxLeft + r, boxTop, boxRight - r, boxTop)
  // Bottom edge
  doc.line(boxLeft + r, boxBottom, boxRight - r, boxBottom)
  // Left edge
  doc.line(boxLeft, boxTop + r, boxLeft, boxBottom - r)
  // Right edge
  doc.line(boxRight, boxTop + r, boxRight, boxBottom - r)
  // Corner arcs (approximate with short diagonal segments)
  // Top-left
  doc.line(boxLeft, boxTop + r, boxLeft + r * 0.4, boxTop + r * 0.1)
  doc.line(boxLeft + r * 0.4, boxTop + r * 0.1, boxLeft + r, boxTop)
  // Top-right
  doc.line(boxRight - r, boxTop, boxRight - r * 0.4, boxTop + r * 0.1)
  doc.line(boxRight - r * 0.4, boxTop + r * 0.1, boxRight, boxTop + r)
  // Bottom-right
  doc.line(boxRight, boxBottom - r, boxRight - r * 0.4, boxBottom - r * 0.1)
  doc.line(boxRight - r * 0.4, boxBottom - r * 0.1, boxRight - r, boxBottom)
  // Bottom-left
  doc.line(boxLeft + r, boxBottom, boxLeft + r * 0.4, boxBottom - r * 0.1)
  doc.line(boxLeft + r * 0.4, boxBottom - r * 0.1, boxLeft, boxBottom - r)

  // Vertical divider
  doc.setLineWidth(0.3)
  doc.line(CX, boxTop + 2, CX, boxBottom - 2)

  // Column positions
  const fromIconX = M + 2
  const fromTextX = M + 6
  const rightIconX = CX + 2
  const rightTextX = CX + 6
  const colMaxWidth = CX - M - 8

  // --- FROM section (left column) ---
  let fromY = boxTop + 7
  drawBuildingIcon(doc, fromIconX, fromY - 4, 2.5, gold)
  fieldLabel('FROM', fromTextX, fromY)
  fromY += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...text)
  for (const line of FROM_ADDRESS) {
    const wrapped = doc.splitTextToSize(line, colMaxWidth)
    for (const wline of wrapped) {
      if (fromY > boxBottom - 3) break
      doc.text(wline, fromTextX, fromY)
      fromY += 3.2
    }
    if (fromY > boxBottom - 3) break
  }

  // --- SHIP TO section (right column) ---
  let shipY = boxTop + 7
  drawPersonIcon(doc, rightIconX, shipY - 4, 2.5, gold)
  fieldLabel('SHIP TO', rightTextX, shipY)
  shipY += 6

  // Customer name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...text)
  doc.text(String(data.customerName || '—'), rightTextX, shipY)
  shipY += 5

  // Phone with icon
  drawPhoneIcon(doc, rightIconX, shipY - 2.5, 2, gold)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text(String(data.phone || '—'), rightTextX + 3, shipY)
  shipY += 5

  // Address with icon
  drawLocationIcon(doc, rightIconX, shipY - 2.5, 2.5, gold)
  const addrLines = data.addressLines.length > 0 ? data.addressLines : ['—']
  for (const line of addrLines) {
    const wrapped = doc.splitTextToSize(line, colMaxWidth - 3)
    for (const wline of wrapped) {
      if (shipY > boxBottom - 3) break
      doc.text(wline, rightTextX + 3, shipY)
      shipY += 3.2
    }
    if (shipY > boxBottom - 3) break
  }

  // ---- GOLD RULE SEPARATOR ---------------------------------------------
  rule(BARCODE_RULE_Y, 0.4, gold)

  // ---- BARCODE ZONE ----------------------------------------------------
  const barcodeText = String(data.orderId || 'ORDER')
  // Calculate barcode width first so we can center it precisely.
  const barcodeModules = code39Modules(barcodeText)
  const barcodeTotalUnits = barcodeModules.reduce((sum, s) => sum + s.width, 0)
  const barcodeUnit = Math.min(0.24, INNER_W / Math.max(1, barcodeTotalUnits))
  const barcodeWidthMm = barcodeTotalUnits * barcodeUnit
  const barcodeX = CX - barcodeWidthMm / 2
  drawCode39(doc, barcodeText, barcodeX, BARCODE_Y, {
    narrow: 0.24,
    height: BARCODE_H,
    maxWidth: INNER_W,
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...text)
  doc.text(id, CX, BARCODE_TEXT_Y, { align: 'center' })

  // ---- FOOTER — PACKED WITH CARE ---------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5)
  doc.setCharSpace(2.2)
  doc.setTextColor(...gold)

  const packedText = 'PACKED WITH CARE'
  const ptw = doc.getTextWidth(packedText)
  const lineLen = 10
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.3)
  doc.line(CX - ptw / 2 - lineLen - 1, PACKED_CARE_Y - 1.2, CX - ptw / 2 - 1, PACKED_CARE_Y - 1.2)
  doc.line(CX + ptw / 2 + 1, PACKED_CARE_Y - 1.2, CX + ptw / 2 + lineLen + 1, PACKED_CARE_Y - 1.2)
  doc.text(packedText, CX, PACKED_CARE_Y, { align: 'center' })
  doc.setCharSpace(0)

  // ---- BOTTOM GOLD RULE + THANK YOU ------------------------------------
  rule(BOTTOM_RULE_Y, 0.4, gold)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setCharSpace(0.6)
  doc.setTextColor(...gold)
  const thankText = 'THANK YOU FOR YOUR ORDER!'
  const tw = doc.getTextWidth(thankText)
  // Diamond gap must be large enough to clear the text + charSpace.
  const diamondGap = tw / 2 + 6
  doc.text(thankText, CX, THANK_YOU_Y, { align: 'center' })
  drawDiamond(doc, CX - diamondGap, THANK_YOU_Y - 1.2, 1, gold)
  drawDiamond(doc, CX + diamondGap, THANK_YOU_Y - 1.2, 1, gold)
  doc.setCharSpace(0)
}

// Builds the multi-label document. Async with per-page yields so the admin UI
// can paint a live progress bar for large ranges.
export async function buildPackingLabelsPdf(orders, { onProgress } = {}) {
  // 4 × 6 inch portrait sheet.
  const doc = new jsPDF({ unit: 'mm', format: [W, H], compress: true })
  const list = Array.isArray(orders) ? orders : []
  for (let i = 0; i < list.length; i++) {
    if (i > 0) doc.addPage([W, H])
    drawLabel(doc, packingLabelData(list[i]))
    onProgress?.(i + 1, list.length)
    if (i < list.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  return doc
}

// Download — one PDF, one label per page.
// Filename: packing-label-ORD-xxxx.pdf (single) or packing-labels-<from>-to-<to>.pdf (range).
export async function downloadPackingLabels(orders, { filename, onProgress } = {}) {
  const doc = await buildPackingLabelsPdf(orders, { onProgress })
  const list = Array.isArray(orders) ? orders : []
  const first = list[0]
  const name = filename || packingLabelFileName(first?.order_number || first?.id)
  doc.save(name)
}

// ---------------------------------------------------------------------------
// Print — standalone 4×6-inch document with ONLY the labels (no nav/buttons),
// one label per page. The print window is opened synchronously by the click
// handler (before any await) so popup blockers never reject it.
// ---------------------------------------------------------------------------
export async function printPackingLabels(orders, { win } = {}) {
  const list = Array.isArray(orders) ? orders : []
  const w = win || window.open('', '_blank', 'width=760,height=920')
  if (!w) throw new Error('POPUP_BLOCKED')
  w.document.write(renderLabelsHtml(list.map(packingLabelData)))
  w.document.close()
  w.focus()
  window.setTimeout(() => w.print(), 400)
}

// Cap the label's variable content the SAME way the PDF does, so the print
// HTML can never push the fixed barcode footer off the 4×6 sheet:
//   - address: at most 4 lines (an ellipsis row marks truncation)
const MAX_ADDRESS_LINES = 4

// Small inline SVG icons for the HTML print version.
const ICON_SVG = {
  building: `<svg width="10" height="12" viewBox="0 0 10 12" fill="#B8862B" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="3" width="8" height="9" rx="0.5"/><rect x="3" y="0" width="4" height="4"/><rect x="3.5" y="8" width="3" height="4" fill="white"/></svg>`,
  person: `<svg width="10" height="12" viewBox="0 0 10 12" fill="#B8862B" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="3.5" r="2.5"/><path d="M0 12 L5 7 L10 12 Z"/></svg>`,
  phone: `<svg width="8" height="10" viewBox="0 0 8 10" fill="#B8862B" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="0" width="6" height="8" rx="1"/><rect x="2" y="1.5" width="4" height="1" fill="white"/><rect x="2" y="5.5" width="4" height="1" fill="white"/></svg>`,
  location: `<svg width="8" height="11" viewBox="0 0 8 11" fill="#B8862B" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="3"/><path d="M1 5 L4 10 L7 5 Z"/><circle cx="4" cy="4" r="1.2" fill="white"/></svg>`,
}

function labelMarkup(data, last) {
  const addressLines = data.addressLines.length > 0 ? data.addressLines : ['—']

  const addressRows =
    addressLines
      .slice(0, MAX_ADDRESS_LINES)
      .map((l) => `<span>${escapeHtml(l)}</span>`)
      .join('') +
    (addressLines.length > MAX_ADDRESS_LINES ? '<span class="trunc">…</span>' : '')

  const barcode = code39Svg(String(data.orderId || 'ORDER'), {
    narrow: 0.22,
    height: 11,
    maxWidth: INNER_W,
  })

  return `
    <section class="label${last ? '' : ' page-break'}">
      <div class="label-body">
        <header class="label-head">
          <strong>HIKMAEXPORTS</strong>
          <span>Packing / Shipping Label</span>
        </header>

        <div class="ornament">
          <hr class="ornament-rule" />
          <span class="ornament-diamond">◆</span>
        </div>

        <div class="field field-order-id">
          <span class="field-label">Order ID</span>
          <strong class="order-id">${escapeHtml(data.orderId)}</strong>
        </div>

        <div class="address-box">
          <div class="address-col from-col">
            <div class="col-header">
              ${ICON_SVG.building}
              <span class="field-label">FROM</span>
            </div>
            <div class="from-address">
              <strong>HIKMAEXPORTS</strong>
              <span>83 &amp; 84, Moore St,</span>
              <span>Mannadi, George Town,</span>
              <span>Chennai, Greater Chennai,</span>
              <span>Tamil Nadu 600001</span>
            </div>
          </div>
          <div class="address-divider"></div>
          <div class="address-col to-col">
            <div class="col-header">
              ${ICON_SVG.person}
              <span class="field-label">SHIP TO</span>
            </div>
            <strong class="value-name">${escapeHtml(data.customerName)}</strong>
            <div class="value-phone">
              ${ICON_SVG.phone}
              <span>${escapeHtml(data.phone)}</span>
            </div>
            <div class="value-address">
              ${ICON_SVG.location}
              ${addressRows}
            </div>
          </div>
        </div>
      </div>

      <footer class="label-foot">
        <div class="barcode-zone">
          ${barcode}
          <span class="barcode-id">${escapeHtml(data.orderId)}</span>
        </div>
        <div class="packed-care">
          <span class="packed-line"></span>
          <span class="packed-text">PACKED WITH CARE</span>
          <span class="packed-line"></span>
        </div>
        <hr class="thank-you-rule" />
        <p class="thank-you">✦ THANK YOU FOR YOUR ORDER! ✦</p>
      </footer>
    </section>`
}

function renderLabelsHtml(labels) {
  const sheets = labels
    .map((data, i) => labelMarkup(data, i === labels.length - 1))
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Packing Labels</title>
<style>
  /* 4 × 6 inch thermal sheet — the label fills the page exactly. */
  @page { size: 101.6mm 152.4mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #ffffff; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1815; }
  .label {
    width: 101.6mm;
    height: 152.4mm;
    padding: 5mm 6mm 4mm;
    display: flex;
    flex-direction: column;
    page-break-inside: avoid;
    overflow: hidden;
  }
  .page-break { page-break-after: always; break-after: page; }

  /* Header — compact, centered */
  .label-head { text-align: center; }
  .label-head strong {
    display: block; font-family: Georgia, serif; font-size: 16px;
    letter-spacing: .04em; color: #171512;
  }
  .label-head span {
    display: block; font-size: 5.2px; letter-spacing: .12em;
    text-transform: uppercase; color: #b8862b; margin-top: .6mm;
  }

  /* Ornament line with centered diamond */
  .ornament { position: relative; text-align: center; margin: 1.5mm 0; }
  .ornament-rule { border: none; border-top: 0.5px solid #b8862b; margin: 0; }
  .ornament-diamond {
    position: relative; top: -6px; background: #fff;
    padding: 0 4px; color: #b8862b; font-size: 8px; line-height: 1;
  }

  /* Fields */
  .field { margin-top: 3.6mm; }
  .field-label {
    display: inline-block; font-size: 6px; font-weight: 700;
    letter-spacing: .18em; text-transform: uppercase; color: #b8862b;
  }
  .order-id {
    display: block; font-size: 14px; font-weight: 700;
    color: #1a1815; letter-spacing: .01em; margin-top: 1mm;
  }

  /* Address box — FROM / SHIP TO side-by-side */
  .address-box {
    flex: 1; display: flex; border: 0.5px solid #b8862b;
    border-radius: 3px; margin-top: 3mm; overflow: hidden; min-height: 0;
  }
  .address-col {
    flex: 1; padding: 3mm; display: flex; flex-direction: column;
    overflow: hidden; min-height: 0;
  }
  .address-divider {
    width: 0.3px; background: #b8862b; margin: 2mm 0; flex-shrink: 0;
  }

  /* Col headers */
  .col-header {
    display: flex; align-items: center; gap: 2px; margin-bottom: 2mm;
  }
  .col-header .field-label { margin-bottom: 0; }
  .col-header .icon { flex-shrink: 0; }

  /* FROM section */
  .from-address { font-size: 6.5px; line-height: 1.5; color: #1a1815; }
  .from-address strong {
    display: block; font-weight: 700; font-size: 7px; margin-bottom: 0.5mm;
  }
  .from-address span { display: block; }

  /* SHIP TO section */
  .value-name {
    display: block; font-size: 8px; font-weight: 700; color: #1a1815;
  }
  .value-phone {
    display: flex; align-items: center; gap: 2px;
    font-size: 6.5px; font-weight: 600; color: #1a1815; margin-top: .8mm;
  }
  .value-address {
    display: flex; gap: 2px; font-size: 6.5px; font-weight: 500;
    line-height: 1.5; margin-top: .8mm;
    word-wrap: break-word; overflow-wrap: anywhere; white-space: normal;
    /* Hard safety net: pathological addresses never push the barcode off. */
    max-height: 18mm; overflow: hidden;
  }
  .value-address > span { display: block; }
  .trunc { color: rgba(26,24,21,.55); }

  /* Footer — barcode zone pinned to the bottom, then the notes */
  .label-foot { flex-shrink: 0; text-align: center; }
  .barcode-zone { border-top: 1px solid rgba(184,134,43,.55); padding-top: 2mm; }
  .barcode-zone svg { display: block; margin: 0 auto; max-width: 100%; }
  .barcode-id {
    display: block; margin-top: 1mm; font-size: 8px; font-weight: 600;
    letter-spacing: .12em; color: #1a1815;
  }

  /* PACKED WITH CARE with flanking lines */
  .packed-care {
    display: flex; align-items: center; gap: 3mm; margin: 2mm 0;
  }
  .packed-line { flex: 1; border-top: 0.3px solid #b8862b; }
  .packed-text {
    font-size: 5.5px; font-weight: 700; letter-spacing: .3em;
    text-transform: uppercase; color: #b8862b; white-space: nowrap;
  }

  /* THANK YOU rule + text */
  .thank-you-rule {
    border: none; border-top: 0.5px solid #b8862b; margin: 1.5mm 0;
  }
  .thank-you {
    font-size: 5.5px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: #b8862b;
    white-space: nowrap;
  }

  /* Icons — small inline SVGs */
  .icon { flex-shrink: 0; display: inline-block; vertical-align: middle; }
  .value-phone .icon, .value-address .icon {
    flex-shrink: 0; display: inline-block;
  }
  .value-address { align-items: flex-start; }
  .value-address > .icon { margin-top: 1px; }

  @media print {
    .page-break { page-break-after: always; break-after: page; }
    .label {
      page-break-inside: avoid;
      /* Force exact 4×6 inch dimensions for the printer. */
      width: 101.6mm !important;
      height: 152.4mm !important;
      padding: 5mm 6mm 4mm !important;
      overflow: visible !important;
    }
    .label-head span { letter-spacing: .12em !important; }
    .thank-you { letter-spacing: .1em !important; white-space: nowrap !important; }
    svg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${sheets}
</body>
</html>`
}
