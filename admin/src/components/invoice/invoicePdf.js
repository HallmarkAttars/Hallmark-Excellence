// ============================================================================
// Invoice PDF / print — true A4 document generation (no screenshots).
//
// Both surfaces are fed by the SAME formatOrderForInvoice() formatter as the
// on-screen <OrderInvoice>, so the PDF, the print-out and the screen always
// agree. Multi-page item tables repeat the header and never split a row.
// ============================================================================

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatOrderForInvoice,
  formatINR,
  invoiceFileName,
} from '../../utils/invoice'

const GOLD = [184, 137, 56]
const INK = [20, 17, 13]
const MUTED = [95, 88, 78]
const LINE = [0, 0, 0]

// jsPDF's built-in fonts use WinAnsiEncoding, which has NO glyph for the
// rupee sign (₹ / U+20B9) — it would render as garbage or nothing. The PDF
// therefore prints "Rs." while the on-screen sheet and print window keep ₹.
const pdfMoney = (value) => formatINR(value).replace('₹', 'Rs. ')

// Load the logo and return a white-backed JPEG data URL (jsPDF-friendly).
// Returns null on ANY failure so a missing asset never breaks generation.
async function loadLogoJpeg(src) {
  try {
    if (!src || typeof window === 'undefined' || !window.fetch) return null
    const res = await window.fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    const bmp = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0)
    bmp.close()
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch {
    return null
  }
}

// --- PDF layout ----------------------------------------------------------
// A4 portrait, 14mm margins. Header rule in gold; items table via autoTable
// (repeated headers + row-safe pagination); totals always match the SAVED
// order total.
export async function buildInvoicePdf(order, { logoUrl } = {}) {
  const inv = formatOrderForInvoice(order)
  const logo = await loadLogoJpeg(logoUrl)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth() // 210
  const H = doc.internal.pageSize.getHeight() // 297
  const M = 14

  // Header
  const logoW = 40
  const logoH = 13
  let brandX = M
  if (logo) {
    doc.addImage(logo, 'JPEG', M, 16, logoW, logoH)
    brandX = M + logoW + 6
  }
  doc.setFont('times', 'bold').setFontSize(21).setTextColor(...INK)
  doc.text('HALLMARK OF EXCELLENCE', brandX, 22, { baseline: 'top' })

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...GOLD)
  doc.text('INVOICE', W - M, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
  doc.text('ORDER RECEIPT', W - M, 25.5, { align: 'right' })

  doc.setDrawColor(...GOLD).setLineWidth(0.8)
  doc.line(M, 34, W - M, 34)

  // Meta (Invoice Ref / Order Date / Order Time)
  let y = 40
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED)
  const meta = []
  if (inv.orderId) meta.push(['Invoice Ref', inv.orderId])
  if (inv.date) meta.push(['Order Date', inv.date])
  if (inv.time) meta.push(['Order Time', inv.time])
  for (const [label, value] of meta) {
    doc.text(`${label}:`, M, y)
    doc.setFont('helvetica', 'bold').setTextColor(...INK)
    doc.text(value, M + 28, y)
    doc.setFont('helvetica', 'normal').setTextColor(...MUTED)
    y += 6
  }

  // BILL TO
  y += 4
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GOLD)
  doc.text('BILL TO', M, y)
  y += 6
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK)
  if (inv.customer.name) { doc.text(inv.customer.name, M, y); y += 6 }
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...MUTED)
  if (inv.customer.phone) { doc.text(inv.customer.phone, M, y); y += 5.5 }
  if (inv.customer.email) { doc.text(inv.customer.email, M, y); y += 5.5 }
  for (const line of inv.addressLines) {
    const wrapped = doc.splitTextToSize(line, W - M * 2)
    doc.text(wrapped, M, y)
    y += wrapped.length * 5 + 1
  }
  y += 4

  // Items table (multi-page aware)
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Item', 'Details', 'Qty', 'Rate', 'Amount']],
    body: inv.items.map((it) => [it.name, it.detail || '', String(it.qty), pdfMoney(it.rate), pdfMoney(it.amount)]),
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      textColor: INK,
      lineColor: LINE,
      lineWidth: 0.1,
      cellPadding: { top: 2.6, bottom: 2.6, left: 1.5, right: 1.5 },
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 8,
      textColor: GOLD,
      fillColor: [255, 255, 255],
      lineColor: GOLD,
      lineWidth: 0.3,
    },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    didDrawPage: () => {
      // tiny page footer: invoice ref
      doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED)
      doc.text(inv.orderId || '', W - M, H - 8, { align: 'right' })
    },
  })

  let ty = (doc.lastAutoTable?.finalY ?? y) + 6

  // Totals
  const totals = [
    ['Subtotal', pdfMoney(inv.subtotal)],
    ['Delivery / Transport', inv.delivery == null ? 'To be confirmed' : pdfMoney(inv.delivery)],
  ]
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED)
  for (const [label, value] of totals) {
    if (ty > H - 40) { doc.addPage(); ty = M }
    doc.text(label, M, ty)
    doc.setFont('helvetica', 'bold').setTextColor(...INK)
    doc.text(value, W - M, ty, { align: 'right' })
    doc.setFont('helvetica', 'normal').setTextColor(...MUTED)
    ty += 6.5
  }
  doc.setDrawColor(...GOLD).setLineWidth(0.4)
  doc.line(M, ty - 2, W - M, ty - 2)
  doc.setFont('helvetica', 'bold').setFontSize(12.5).setTextColor(...INK)
  doc.text('Total', M, ty)
  doc.text(pdfMoney(inv.total), W - M, ty, { align: 'right' })
  ty += 10

  // Payment method + status
  if (ty > H - 46) { doc.addPage(); ty = M }
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...MUTED)
  doc.text(`Payment Method:  ${inv.paymentMethod}`, M, ty)
  doc.text(`Order Status:    ${inv.status}`, M + 85, ty)
  ty += 10

  // Footer
  if (ty > H - 40) { doc.addPage(); ty = M }
  doc.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(...MUTED)
  doc.text(inv.company.gstNote, W / 2, ty, { align: 'center' })
  ty += 6
  doc.setFont('times', 'italic').setFontSize(12).setTextColor(...INK)
  doc.text(inv.company.thanks, W / 2, ty, { align: 'center' })
  ty += 8
  doc.setDrawColor(...LINE).setLineWidth(0.15)
  doc.line(M, ty - 2, W - M, ty - 2)
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...INK)
  doc.text(inv.company.name, W / 2, ty, { align: 'center' })
  ty += 5
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
  const contactLine = [inv.company.phone, inv.company.email].filter(Boolean).join('  ·  ')
  if (contactLine) doc.text(contactLine, W / 2, ty, { align: 'center' })

  return doc
}

// Download Invoice-ORD-592546.pdf — stable filename, single-shot.
export async function downloadInvoicePdf(order, { logoUrl } = {}) {
  const doc = await buildInvoicePdf(order, { logoUrl })
  const orderId = order.orderId || order.order_number || order.orderNumber
  doc.save(invoiceFileName(orderId))
}

// Print — writes a dedicated clean A4 document (no navigation, no buttons)
// into the provided window and triggers the print dialog / Save-as-PDF.
// `win` is opened synchronously by the click handler (before any await) so
// popup blockers never reject it.
export async function printInvoice(order, { logoUrl, win } = {}) {
  const inv = formatOrderForInvoice(order)
  const logo = await loadLogoJpeg(logoUrl)
  const w = win || window.open('', '_blank', 'width=900,height=1100')
  if (!w) {
    throw new Error('POPUP_BLOCKED')
  }
  w.document.write(renderPrintHtml(inv, logo))
  w.document.close()
  w.focus()
  window.setTimeout(() => {
    w.print()
  }, 400)
}

// Standalone A4 HTML document for the print window.
function renderPrintHtml(inv, logo) {
  const rows = inv.items
    .map(
      (it) => `<tr>
        <td class="name">${escapeHtml(it.name)}</td>
        <td class="detail">${escapeHtml(it.detail)}</td>
        <td class="num">${it.qty}</td>
        <td class="num">${formatINR(it.rate)}</td>
        <td class="num">${formatINR(it.amount)}</td>
      </tr>`
    )
    .join('')

  const meta = []
  if (inv.orderId) meta.push(`<li><span>Invoice Ref</span><strong>${escapeHtml(inv.orderId)}</strong></li>`)
  if (inv.date) meta.push(`<li><span>Order Date</span><strong>${escapeHtml(inv.date)}</strong></li>`)
  if (inv.time) meta.push(`<li><span>Order Time</span><strong>${escapeHtml(inv.time)}</strong></li>`)

  const billTo = []
  if (inv.customer.name) billTo.push(`<p class="customer">${escapeHtml(inv.customer.name)}</p>`)
  if (inv.customer.phone) billTo.push(`<p>${escapeHtml(inv.customer.phone)}</p>`)
  if (inv.customer.email) billTo.push(`<p>${escapeHtml(inv.customer.email)}</p>`)
  inv.addressLines.forEach((l) => billTo.push(`<p>${escapeHtml(l)}</p>`))

  const companyFoot = [inv.company.name, inv.company.phone, inv.company.email].filter(Boolean)
    .map((v) => `<span>${escapeHtml(v)}</span>`)
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(inv.orderId || '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #fff; }
  .sheet { width: 210mm; min-height: 285mm; margin: 0 auto; padding: 14mm; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #b88938; padding-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { height: 44px; }
  .brand .company { font-size: 20px; font-weight: 700; letter-spacing: 0.05em; }
  .title { text-align: right; }
  .title h2 { font-size: 30px; letter-spacing: 0.14em; text-transform: uppercase; }
  .title p { font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: #8a6a2f; margin-top: 6px; }
  ul.meta { list-style: none; display: flex; flex-wrap: wrap; gap: 6px 28px; padding: 14px 0; border-bottom: 1px solid #ddd; }
  ul.meta li { font-size: 12px; color: #5f584e; }
  ul.meta li strong { color: #14110d; }
  ul.meta li span { margin-right: 8px; }
  .billto { padding: 16px 0 14px; border-bottom: 1px solid #ddd; }
  .billto h3 { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #8a6a2f; margin-bottom: 8px; }
  .billto p { font-size: 13px; color: #33302b; }
  .billto p.customer { font-size: 15px; font-weight: 700; color: #14110d; }
  table.items { width: 100%; border-collapse: collapse; margin: 18px 0 14px; }
  table.items th { text-align: left; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a6a2f; padding: 7px 8px; border-bottom: 1.5px solid #b88938; }
  table.items td { padding: 8px; font-size: 13px; border-bottom: 1px solid #eee; vertical-align: top; }
  table.items td.name { font-weight: 600; }
  table.items td.detail { color: #5f584e; }
  table.items .num { text-align: right; }
  .totals { border-bottom: 1px solid #ddd; padding-bottom: 12px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #33302b; }
  .row.grand { border-top: 1px solid #b88938; margin-top: 6px; padding-top: 9px; font-size: 16px; font-weight: 700; color: #14110d; }
  .pay { display: flex; gap: 40px; padding: 12px 0; border-bottom: 1px solid #ddd; font-size: 12px; color: #5f584e; }
  .pay strong { color: #14110d; margin-left: 6px; }
  .foot { padding-top: 16px; text-align: center; }
  .foot .gst { font-size: 11px; color: #5f584e; }
  .foot .thanks { font-family: Georgia, serif; font-style: italic; font-size: 16px; color: #14110d; margin: 8px 0 14px; }
  .foot .company-foot { border-top: 1px solid #ddd; padding-top: 10px; font-size: 11px; color: #5f584e; display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; }
  .foot .company-foot span:first-child { font-weight: 700; color: #14110d; letter-spacing: 0.08em; }
  @page { size: A4; margin: 12mm; }
  @media print { body { background: #fff; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">
        ${logo ? `<img src="${logo}" alt="" />` : ''}
        <span class="company">${escapeHtml(inv.company.name)}</span>
      </div>
      <div class="title">
        <h2>Invoice</h2>
        <p>Order Receipt</p>
      </div>
    </div>

    <ul class="meta">${meta.join('')}</ul>

    <div class="billto">
      <h3>Bill To</h3>
      ${billTo.join('')}
    </div>

    <table class="items">
      <thead>
        <tr><th>Item</th><th>Details</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5">No items recorded for this order.</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatINR(inv.subtotal)}</span></div>
      <div class="row"><span>Delivery / Transport</span><span>${inv.delivery == null ? 'To be confirmed' : formatINR(inv.delivery)}</span></div>
      <div class="row grand"><span>Total</span><span>${formatINR(inv.total)}</span></div>
    </div>

    <div class="pay">
      <div><span>Payment Method</span><strong>${escapeHtml(inv.paymentMethod)}</strong></div>
      <div><span>Order Status</span><strong>${escapeHtml(inv.status)}</strong></div>
    </div>

    <div class="foot">
      <p class="gst">${escapeHtml(inv.company.gstNote)}</p>
      <p class="thanks">${escapeHtml(inv.company.thanks)}</p>
      <div class="company-foot">${companyFoot}</div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
