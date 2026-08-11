// ============================================================================
// Packing / shipping label — compact 4" × 6" thermal label (PDF + print).
// ADMIN ONLY. One label per order, each on its own page, for pasting onto
// the parcel.
//
// Carries ONLY packing/delivery data: Order ID (as text + a real Code 39
// barcode), Customer, Mobile, wrapped Delivery Address, Payment method and a
// compact ITEMS list. No prices, no email, no internal info.
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
import { code39Svg, drawCode39 } from '../../utils/barcode'

// Palette — Arees & Dahab luxury (matches the admin/invoice design language).
const INK = [23, 21, 18] // #171512
const TEXT = [26, 24, 21] // #1A1815
const GOLD = [184, 134, 43] // #B8862B
const HAIRLINE = [230, 224, 208] // #E6E0D0

// Sheet size — 4" × 6" portrait, mm.
const W = 101.6
const H = 152.4
const M = 6 // outer margin
const CX = W / 2
const INNER_W = W - M * 2

// Fixed lower band — the barcode must never collide with content.
const BARCODE_RULE_Y = 102 // gold divider under the content zone
const BARCODE_Y = 108.5 // barcode top
const BARCODE_H = 12
const BARCODE_TEXT_Y = BARCODE_Y + BARCODE_H + 5.5

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// PDF page — vector label (no HTML rendering, no font embedding needed).
// ---------------------------------------------------------------------------
function drawLabel(doc, data) {
  const ink = INK.map((v) => v / 255)
  const text = TEXT.map((v) => v / 255)
  const gold = GOLD.map((v) => v / 255)
  const hairline = HAIRLINE.map((v) => v / 255)

  const fieldLabel = (label, y) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.6)
    doc.setCharSpace(1.6)
    doc.setTextColor(...gold)
    doc.text(label.toUpperCase(), M, y)
    doc.setCharSpace(0)
  }
  const rule = (y, width = 0.4, color = gold) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(width)
    doc.line(M, y, W - M, y)
  }

  // ---- Header (compact, centered) ----------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ink)
  doc.text('AREES & DAHAB', CX, 9.5, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.8)
  doc.setCharSpace(2)
  doc.setTextColor(...gold)
  doc.text('PACKING / SHIPPING LABEL', CX, 13.2, { align: 'center' })
  doc.setCharSpace(0)
  rule(15.2)

  // ---- ORDER ID — the largest text on the label ---------------------------
  let y = 21
  fieldLabel('Order ID', y)
  y += 6.6
  // Fit the id into one line at the biggest size that fits. The font size
  // must be set BEFORE measuring (getTextWidth scales with the current size).
  const id = String(data.orderId || '—')
  let idSize = 20
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...text)
  while (idSize > 10) {
    doc.setFontSize(idSize)
    if (doc.getTextWidth(id) <= INNER_W) break
    idSize -= 1
  }
  doc.text(id, M, y)
  y += idSize / 2 + 2.6
  rule(y, 0.25, hairline)

  // ---- SHIP TO -------------------------------------------------------------
  y += 7
  fieldLabel('Ship To', y)
  y += 5.6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...text)
  doc.text(String(data.customerName || '—'), M, y)
  y += 5.4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.6)
  doc.setTextColor(...text)
  doc.text(String(data.phone || '—'), M, y)
  y += 5.2

  // Delivery address — wraps naturally and is capped (4 wrapped lines + an
  // ellipsis) so the Order Summary always stays above the barcode band, no
  // matter how long the address is. The floor is a hard safety net; the cap
  // is what actually guarantees the layout never reaches it.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.4)
  doc.setTextColor(...text)
  // Hard safety net just above the barcode rule. The 4-line caps below are
  // what actually keep the summary on the label; this floor guarantees the
  // address/items text can never touch the rule even with degenerate input.
  const floor = BARCODE_RULE_Y - 1
  const addrLines = data.addressLines.length > 0 ? data.addressLines : ['—']
  const wrapped = []
  for (const line of addrLines) {
    wrapped.push(...doc.splitTextToSize(String(line), INNER_W))
  }
  let addrDrawn = 0
  for (const line of wrapped) {
    if (addrDrawn >= 4 || (addrDrawn > 0 && y + 3.4 > floor)) break
    doc.text(String(line), M, y)
    y += 3.4
    addrDrawn += 1
  }
  if (wrapped.length > addrDrawn) {
    doc.setFontSize(7.4)
    doc.setTextColor(...text)
    doc.text('…', M, y + 0.5)
  }

  // ---- ORDER SUMMARY — payment + compact item list -------------------------
  y = Math.max(y + 3, BARCODE_RULE_Y - 40)
  fieldLabel('Order Summary', y)
  y += 5.2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.6)
  doc.setTextColor(...text)
  doc.text(`PAYMENT: ${String(data.payment || '—')}`, M, y)
  y += 4.8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(...text)
  const items = Array.isArray(data.items) ? data.items : []
  const itemLines = items.map(
    (it) => `${it.quantity} × ${it.name}${it.size ? ` — ${it.size}` : ''}`
  )
  let itemsDrawn = 0
  for (const line of itemLines) {
    if (itemsDrawn >= 4 || (itemsDrawn > 0 && y + 3.2 > floor)) break
    doc.text(String(line), M, y)
    y += 3.2
    itemsDrawn += 1
  }
  if (items.length > itemsDrawn) {
    doc.setFontSize(6.8)
    doc.setTextColor(...text)
    doc.text('…', M, y + 0.5)
  }
  if (items.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...text)
    doc.text('—', M, y + 0.5)
  }

  // ---- Barcode band (fixed, real Code 39 of the Order ID) ------------------
  rule(BARCODE_RULE_Y, 0.4, gold)
  const barcodeText = String(data.orderId || 'ORDER')
  // Shrink the module width so the barcode never spills past the margins.
  drawCode39(doc, barcodeText, M, BARCODE_Y, {
    narrow: 0.24,
    height: BARCODE_H,
    maxWidth: INNER_W,
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.4)
  doc.setTextColor(...text)
  doc.text(id, CX, BARCODE_TEXT_Y, { align: 'center' })

  // ---- Footer (small, no wasted space) -------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.8)
  doc.setCharSpace(2.2)
  doc.setTextColor(...gold)
  doc.text('PACKED WITH CARE', CX, H - 5.5, { align: 'center' })
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
//   - items:   at most 4 rows (an ellipsis row marks truncation)
const MAX_ADDRESS_LINES = 4
const MAX_ITEM_ROWS = 4

function labelMarkup(data, last) {
  const items = Array.isArray(data.items) ? data.items : []
  const addressLines = data.addressLines.length > 0 ? data.addressLines : ['—']

  const addressRows =
    addressLines.slice(0, MAX_ADDRESS_LINES).map((l) => `<span>${escapeHtml(l)}</span>`).join('') +
    (addressLines.length > MAX_ADDRESS_LINES ? '<span class="trunc">…</span>' : '')

  const itemRows =
    items.length > 0
      ? items
          .slice(0, MAX_ITEM_ROWS)
          .map(
            (it) =>
              `<li><span class="sum-item-qty">${escapeHtml(it.quantity)} ×</span> ${escapeHtml(it.name)}${it.size ? ` <span class="sum-item-size">— ${escapeHtml(it.size)}</span>` : ''}</li>`
          )
          .join('') +
        (items.length > MAX_ITEM_ROWS ? '<li class="trunc">…</li>' : '')
      : '<li class="sum-empty">—</li>'
  const barcode = code39Svg(String(data.orderId || 'ORDER'), { narrow: 0.22, height: 11, maxWidth: INNER_W })

  return `
    <section class="label${last ? '' : ' page-break'}">
      <div class="label-body">
        <header class="label-head">
          <strong>AREES &amp; DAHAB</strong>
          <span>Packing / Shipping Label</span>
        </header>

        <div class="field field-order-id">
          <span class="field-label">Order ID</span>
          <strong class="order-id">${escapeHtml(data.orderId)}</strong>
        </div>

        <div class="field">
          <span class="field-label">Ship To</span>
          <strong class="value value-name">${escapeHtml(data.customerName)}</strong>
          <span class="value value-phone">${escapeHtml(data.phone)}</span>
          <div class="value value-address">
            ${addressRows}
          </div>
        </div>

        <div class="field">
          <span class="field-label">Order Summary</span>
          <p class="sum-payment">PAYMENT: <strong>${escapeHtml(data.payment)}</strong></p>
          <ul class="sum-items">${itemRows}</ul>
        </div>
      </div>

      <footer class="label-foot">
        <div class="barcode-zone">
          ${barcode}
          <span class="barcode-id">${escapeHtml(data.orderId)}</span>
        </div>
        <p class="foot-note">Packed With Care</p>
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
  .label-head { text-align: center; border-bottom: 1.2px solid #b8862b; padding-bottom: 1.8mm; }
  .label-head strong { display: block; font-family: Georgia, serif; font-size: 13px; letter-spacing: .04em; color: #171512; }
  .label-head span { display: block; font-size: 5.2px; letter-spacing: .24em; text-transform: uppercase; color: #b8862b; margin-top: .6mm; }

  /* Fields */
  .field { margin-top: 3.6mm; }
  .field-label {
    display: block; font-size: 6px; font-weight: 700;
    letter-spacing: .18em; text-transform: uppercase; color: #b8862b; margin-bottom: 1mm;
  }
  .order-id { display: block; font-size: 22px; font-weight: 800; color: #1a1815; letter-spacing: .01em; }
  .value { display: block; }
  .value-name { font-size: 11px; font-weight: 700; color: #1a1815; }
  .value-phone { font-size: 8px; font-weight: 600; color: #1a1815; margin-top: .6mm; }
  .value-address {
    font-size: 7.5px; font-weight: 500; line-height: 1.5; margin-top: 1.2mm;
    word-wrap: break-word; overflow-wrap: anywhere; white-space: normal;
    /* Hard safety net: even a single line that wraps many times (pathological
       addresses) can never push the barcode footer off the fixed 4×6 sheet.
       ~14mm ≈ the PDF's 4 wrapped address lines (3.4mm each). */
    max-height: 14mm; overflow: hidden;
  }

  /* Order summary — payment + compact item list */
  .sum-payment { font-size: 8px; font-weight: 600; color: #1a1815; }
  .sum-payment strong { font-weight: 700; }
  .sum-items { list-style: none; margin-top: 1mm; }
  .sum-items li { font-size: 7px; line-height: 1.5; color: #1a1815; }
  .sum-items { max-height: 16mm; overflow: hidden; }
  .sum-item-qty { font-weight: 700; }
  .sum-item-size { color: rgba(26,24,21,.72); }
  .sum-empty { color: rgba(26,24,21,.5); }
  .trunc { color: rgba(26,24,21,.55); }

  /* Footer — barcode zone pinned to the bottom, then the tiny note */
  .label-foot { margin-top: auto; text-align: center; }
  .barcode-zone { border-top: 1px solid rgba(184,134,43,.55); padding-top: 2mm; }
  .barcode-zone svg { display: block; margin: 0 auto; max-width: 100%; }
  .barcode-id {
    display: block; margin-top: 1mm; font-size: 8px; font-weight: 600; letter-spacing: .12em; color: #1a1815;
  }
  .foot-note { margin-top: 1.2mm; font-size: 5.5px; font-weight: 700; letter-spacing: .3em; text-transform: uppercase; color: #b8862b; }

  @media print {
    .page-break { page-break-after: always; break-after: page; }
    .label { page-break-inside: avoid; }
    svg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${sheets}
</body>
</html>`
}
