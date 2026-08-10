// ============================================================================
// Packing / shipping label — PDF + print. ADMIN ONLY.
// One label per order, each on its own page, for pasting onto the parcel.
// Carries ONLY packing/delivery data: Order ID, Customer, Mobile, Address.
// No prices, no payment details, no email, no internal info.
//
// Reuses the same jsPDF stack as the invoice generator (no new dependency).
// ============================================================================

import { jsPDF } from 'jspdf'
import { packingLabelData, packingLabelFileName } from '../../utils/packing'

// Palette — Arees & Dahab luxury (matches the admin/invoice design language).
const INK = [23, 21, 18] // #171512
const TEXT = [26, 24, 21] // #1A1815
const GOLD = [184, 134, 43] // #B8862B
const CREAM = [247, 242, 232] // #F7F2E8
const HAIRLINE = [230, 224, 208] // #E6E0D0

const P = 210 // A4 width (mm)
const H = 297 // A4 height (mm)
const M = 12 // outer frame margin

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
  const cream = CREAM.map((v) => v / 255)

  // Gold hairline frame + inner outline
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.5)
  doc.rect(M, M, P - M * 2, H - M * 2)
  doc.setLineWidth(0.2)
  doc.setDrawColor(...gold.map((v) => Math.min(1, v + 0.18)))
  doc.rect(M + 2, M + 2, P - (M + 2) * 2, H - (M + 2) * 2)

  // Brand header
  let y = 30
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...ink)
  doc.text('AREES & DAHAB', P / 2, y, { align: 'center' })
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setCharSpace(2.2)
  doc.setTextColor(...gold)
  doc.text('PACKING / SHIPPING LABEL', P / 2, y, { align: 'center' })
  doc.setCharSpace(0)

  // Gold divider under the header
  y += 7
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.4)
  doc.line(M + 16, y, P - M - 16, y)
  y += 16

  const fieldLabel = (label) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setCharSpace(1.8)
    doc.setTextColor(...gold)
    doc.text(label.toUpperCase(), M + 16, y)
    doc.setCharSpace(0)
  }
  const hairline = () => {
    doc.setDrawColor(...HAIRLINE.map((v) => v / 255))
    doc.setLineWidth(0.25)
    doc.line(M + 16, y, P - M - 16, y)
  }

  // ORDER ID — strong and prominent
  fieldLabel('Order ID')
  y += 9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...text)
  doc.text(String(data.orderId || '—'), M + 16, y)
  y += 12
  hairline()
  y += 13

  // CUSTOMER
  fieldLabel('Customer')
  y += 9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...text)
  doc.text(String(data.customerName || '—'), M + 16, y)
  y += 11
  hairline()
  y += 13

  // MOBILE
  fieldLabel('Mobile')
  y += 9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(String(data.phone || '—'), M + 16, y)
  y += 11
  hairline()
  y += 13

  // DELIVERY ADDRESS — only available lines, never "undefined"
  fieldLabel('Delivery Address')
  y += 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(...text)
  const lines = data.addressLines.length > 0 ? data.addressLines : ['—']
  const pillY = H - M - 20
  const maxLineY = pillY - 10 // never collide with the footer pill
  for (const line of lines) {
    if (y > maxLineY) break
    doc.text(String(line), M + 16, y)
    y += 8
  }

  // Footer — PACK & DISPATCH pill
  doc.setFillColor(...cream)
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.35)
  doc.roundedRect(M + 16, pillY, P - (M + 16) * 2, 13, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setCharSpace(2.4)
  doc.setTextColor(...gold)
  doc.text('PACK & DISPATCH', P / 2, pillY + 8.6, { align: 'center' })
  doc.setCharSpace(0)
}

// Builds the multi-label document. Async with per-page yields so the admin UI
// can paint a live progress bar for large ranges.
export async function buildPackingLabelsPdf(orders, { onProgress } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const list = Array.isArray(orders) ? orders : []
  for (let i = 0; i < list.length; i++) {
    if (i > 0) doc.addPage()
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
// Print — standalone A4 document with ONLY the labels (no nav/buttons), one
// label per page. The print window is opened synchronously by the click
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

function labelMarkup(data, last) {
  return `
    <section class="label${last ? '' : ' page-break'}">
      <div class="frame">
        <header class="label-head">
          <strong>AREES &amp; DAHAB</strong>
          <span>Packing / Shipping Label</span>
        </header>
        <div class="field">
          <span class="field-label">Order ID</span>
          <strong class="order-id">${escapeHtml(data.orderId)}</strong>
        </div>
        <div class="field">
          <span class="field-label">Customer</span>
          <strong class="value">${escapeHtml(data.customerName)}</strong>
        </div>
        <div class="field">
          <span class="field-label">Mobile</span>
          <strong class="value">${escapeHtml(data.phone)}</strong>
        </div>
        <div class="field">
          <span class="field-label">Delivery Address</span>
          ${(data.addressLines.length > 0 ? data.addressLines : ['—'])
            .map((l) => `<span class="value address">${escapeHtml(l)}</span>`)
            .join('')}
        </div>
        <footer class="label-foot">Pack &amp; Dispatch</footer>
      </div>
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
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #ffffff; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1815; }
  .label { width: 210mm; min-height: 297mm; margin: 0 auto; }
  .frame {
    position: relative;
    margin: 12mm;
    padding: 24mm 14mm 18mm;
    border: 1px solid rgba(184,134,43,.55);
    outline: 1px solid rgba(184,134,43,.18);
    outline-offset: 3px;
    min-height: 273mm;
    display: flex;
    flex-direction: column;
  }
  .label-head { text-align: center; border-bottom: 1.2px solid #b8862b; padding-bottom: 4mm; }
  .label-head strong { display: block; font-family: Georgia, serif; font-size: 22px; letter-spacing: .04em; color: #171512; }
  .label-head span { display: block; font-size: 8px; letter-spacing: .26em; text-transform: uppercase; color: #b8862b; margin-top: 1.6mm; }
  .field { margin-top: 10mm; }
  .field-label { display: block; font-size: 8px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #b8862b; margin-bottom: 2.4mm; }
  .field .order-id { display: block; font-size: 26px; font-weight: 800; color: #1a1815; letter-spacing: .01em; }
  .field .value { display: block; font-size: 15px; font-weight: 700; color: #1a1815; }
  .field .address { font-weight: 500; line-height: 1.55; }
  .label-foot {
    margin-top: auto;
    margin-bottom: 0;
    text-align: center;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .28em;
    text-transform: uppercase;
    color: #b8862b;
    background: #f7f2e8;
    border: 1px solid rgba(184,134,43,.5);
    border-radius: 3mm;
    padding: 4mm 0;
  }
  @media print {
    .page-break { page-break-after: always; break-after: page; }
    .label { page-break-inside: avoid; }
  }
</style>
</head>
<body>
${sheets}
</body>
</html>`
}
