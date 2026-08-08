// ============================================================================
// Invoice PDF / print — premium A4 document generation (no screenshots).
//
// DESIGN: luxury ecommerce invoice for Hallmark Excellence.
//   • Header  — logo (aspect-preserved) + brand name + tagline | INVOICE +
//               invoice # / date / time, thin gold divider, contact strip
//   • Cards   — BILL TO + ORDER INFORMATION side by side on a warm cream fill
//   • Table   — dark header, white rows, subtle separators, brand · size
//               detail lines, per-line "Bulk Price Applied" tag
//   • Summary — right-aligned Subtotal / Delivery / TOTAL (gold amount)
//   • Payment / status row, then a centred thank-you footer
//
// DATA: every figure is the SAVED order's own value (utils/invoice.js feeds
// all three surfaces — screen, print, PDF — so they always agree). Nothing is
// recalculated here and no value is ever invented.
//
// CURRENCY: jsPDF's built-in fonts (WinAnsiEncoding) have no ₹ glyph, so the
// PDF embeds a ₹-capable font (Noto Sans, loaded once from a CDN). When the
// font cannot be loaded — offline, blocked — money falls back to "Rs." in the
// standard Helvetica font so generation never breaks.
// ============================================================================

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatOrderForInvoice,
  formatINR,
  invoiceFileName,
} from '../../utils/invoice'

// --- Palette (Hallmark Excellence) ----------------------------------------
const INK = [17, 17, 17] // #111111
const TEXT = [34, 34, 34] // #222222
const MUTED = [102, 102, 102] // #666666
const GOLD = [184, 134, 43] // #B8862B
const GOLD_LIGHT = [212, 175, 55] // #D4AF37
const CREAM = [248, 244, 236] // #F8F4EC
const CREAM_BORDER = [232, 220, 195] // #E8DCC3 — soft cream thumb frame
const HAIRLINE = [235, 231, 222]

// --- Rupee-capable font (optional) -----------------------------------------
// Loaded once, cached for the session; returns base64 TTF or null on failure.
const RUPEE_FONT_URL =
  'https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans@0.2.3/NotoSans_400Regular.ttf'
const RUPEE_FONT = 'NotoSans'

let rupeeFontPromise = null
function getRupeeFontBase64() {
  if (!rupeeFontPromise) {
    rupeeFontPromise = (async () => {
      try {
        if (typeof window === 'undefined' || !window.fetch) return null
        const res = await window.fetch(RUPEE_FONT_URL)
        if (!res.ok) return null
        const bytes = new Uint8Array(await res.arrayBuffer())
        let binary = ''
        const CHUNK = 0x8000
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
        }
        return btoa(binary)
      } catch {
        return null
      }
    })()
  }
  return rupeeFontPromise
}

// Register the rupee font on THIS document. Returns true when available so
// callers can render "₹…" (in Noto Sans) instead of "Rs. …".
async function registerRupeeFont(doc) {
  const base64 = await getRupeeFontBase64()
  if (!base64) return false
  try {
    doc.addFileToVFS(`${RUPEE_FONT}-Regular.ttf`, base64)
    doc.addFont(`${RUPEE_FONT}-Regular.ttf`, RUPEE_FONT, 'normal')
    return true
  } catch {
    return false
  }
}

// Money string for the PDF: "₹18,045" when the rupee font is embedded,
// otherwise "Rs. 18,045" (standard Helvetica can render that fine).
const money = (value) => formatINR(value)
const pdfMoney = (value) => formatINR(value).replace('₹', 'Rs. ')

// Draw a money value, switching to the rupee font when embedded.
function drawMoney(doc, rupee, value, x, y, { align = 'left', size = 9, color = TEXT } = {}) {
  if (rupee) {
    doc.setFont(RUPEE_FONT, 'normal')
  } else {
    doc.setFont('helvetica', 'normal')
  }
  doc.setFontSize(size).setTextColor(...color)
  doc.text(rupee ? money(value) : pdfMoney(value), x, y, { align })
}

// Shared image loader: fetches an image, optionally downscales it, and
// returns a white-backed JPEG data URL + natural size (so the caller can
// preserve aspect ratio). Cached per URL so an image used on several lines
// is fetched and embedded once. Every fetch carries a timeout — a hanging
// CDN must never stall invoice generation. Returns null on ANY failure.
const imageCache = new Map()
function loadImageDataUrl(src, { maxSize } = {}) {
  if (!src) return Promise.resolve(null)
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      (async () => {
        try {
          if (typeof window === 'undefined' || !window.fetch) return null
          const res = await window.fetch(src, { signal: AbortSignal.timeout(8000) })
          if (!res.ok) return null
          const blob = await res.blob()
          const bmp = await createImageBitmap(blob)
          let w = bmp.width
          let h = bmp.height
          if (maxSize) {
            const scale = Math.min(1, maxSize / Math.max(w, h))
            w = Math.max(1, Math.round(w * scale))
            h = Math.max(1, Math.round(h * scale))
          }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(bmp, 0, 0, w, h)
          bmp.close()
          return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), w, h }
        } catch {
          return null
        }
      })()
    )
  }
  return imageCache.get(src)
}

// Logo: natural size preserved (the PDF computes aspect-correct dimensions).
function loadLogo(src) {
  return loadImageDataUrl(src)
}

// Product thumbnail: downscaled to ≤128px so the PDF stays light; the row
// simply renders without a thumbnail when the image is missing or broken.
function loadThumb(src) {
  return loadImageDataUrl(src, { maxSize: 128 }).then((img) => (img ? img.dataUrl : null))
}

// ---------------------------------------------------------------------------
// PDF layout
// ---------------------------------------------------------------------------
export async function buildInvoicePdf(order, { logoUrl } = {}) {
  const inv = formatOrderForInvoice(order)
  const logo = await loadLogo(logoUrl)
  // Best-effort product thumbnails from the saved snapshot — one per item,
  // loaded up front so the table can draw them during layout.
  const thumbs = await Promise.all(
    inv.items.map((it) => (it.image ? loadThumb(it.image) : Promise.resolve(null)))
  )

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const rupee = await registerRupeeFont(doc)
  const W = doc.internal.pageSize.getWidth() // 210
  const H = doc.internal.pageSize.getHeight() // 297
  const M = 14 // margin
  const CW = W - M * 2 // content width 182

  // ============================= HEADER =====================================
  let brandX = M
  if (logo) {
    const logoW = 38
    const logoH = Math.max(10, Math.min(16, (logoW * logo.h) / logo.w))
    doc.addImage(logo.dataUrl, 'JPEG', M, 15, logoW, logoH)
    brandX = M + logoW + 8
  }
  // Brand name + tagline (left)
  doc.setFont('times', 'bold').setFontSize(17).setTextColor(...INK)
  doc.text(inv.company.name, brandX, 17)
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GOLD_LIGHT)
  if (inv.company.tagline) doc.text(inv.company.tagline, brandX, 23.5)

  // INVOICE title (right)
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...INK)
  doc.text('INVOICE', W - M, 17, { align: 'right', charSpace: 2.5 })
  let ry = 27
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...TEXT)
  if (inv.orderId) {
    doc.text(`Invoice # ${inv.orderId}`, W - M, ry, { align: 'right' })
    ry += 4.5
  }
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
  if (inv.date) {
    doc.text(`Date: ${inv.date}`, W - M, ry, { align: 'right' })
    ry += 4.5
  }
  if (inv.time) doc.text(`Time: ${inv.time}`, W - M, ry, { align: 'right' })

  // Thin gold divider
  doc.setDrawColor(...GOLD).setLineWidth(0.7)
  doc.line(M, 43, W - M, 43)

  // Business contact strip (real config values only)
  const contactBits = [inv.company.phone, inv.company.email].filter(Boolean)
  if (contactBits.length > 0) {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED)
    doc.text(contactBits.join('   ·   '), M, 48.5)
  }

  // ========================= BILL TO / ORDER INFO ===========================
  const cardGap = 8
  const cardW = (CW - cardGap) / 2 // 87
  const padX = 4.5
  const padY = 4.5

  // Measure BILL TO content
  const billLines = []
  if (inv.customer.name) billLines.push({ text: inv.customer.name, size: 10.5, style: 'bold', color: INK })
  if (inv.customer.phone) billLines.push({ text: inv.customer.phone, size: 8.5, style: 'normal', color: TEXT })
  if (inv.customer.email) billLines.push({ text: inv.customer.email, size: 8.5, style: 'normal', color: TEXT })
  for (const line of inv.addressLines) {
    const wrapped = doc.splitTextToSize(line || '', cardW - padX * 2)
    for (const l of wrapped) billLines.push({ text: l, size: 8.5, style: 'normal', color: MUTED })
  }
  let billH = 9 // heading + gap
  billLines.forEach((l) => {
    billH += l.size * 0.5 + (l.style === 'bold' ? 1.6 : 0.8)
  })

  // ORDER INFORMATION rows (real values only)
  const orderRows = []
  if (inv.orderId) orderRows.push(['Order ID', inv.orderId])
  if (inv.date) orderRows.push(['Date', inv.date])
  if (inv.time) orderRows.push(['Time', inv.time])
  if (inv.paymentMethod) orderRows.push(['Payment', inv.paymentMethod])
  const orderH = 9 + orderRows.length * 6

  const cardH = Math.max(billH, orderH) + padY * 2
  let y = 56

  // Draw the two cards
  doc.setFillColor(...CREAM)
  doc.setDrawColor(...GOLD_LIGHT)
  doc.setLineWidth(0.25)
  doc.roundedRect(M, y, cardW, cardH, 2.5, 2.5, 'FD')
  doc.roundedRect(M + cardW + cardGap, y, cardW, cardH, 2.5, 2.5, 'FD')

  // BILL TO text
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GOLD)
  doc.text('BILL TO', M + padX, y + padY + 3.5)
  let by = y + padY + 8
  for (const l of billLines) {
    doc.setFont('helvetica', l.style).setFontSize(l.size).setTextColor(...l.color)
    doc.text(l.text, M + padX, by)
    by += l.size * 0.5 + (l.style === 'bold' ? 1.6 : 0.8)
  }

  // ORDER INFORMATION text
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GOLD)
  doc.text('ORDER INFORMATION', M + cardW + cardGap + padX, y + padY + 3.5)
  let oy = y + padY + 8
  for (const [label, value] of orderRows) {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    doc.text(label, M + cardW + cardGap + padX, oy)
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXT)
    doc.text(value, M + cardW + cardGap + padX + 26, oy)
    oy += 6
  }

  // ============================= ITEMS TABLE ================================
  const tableStartY = y + cardH + 7
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: M, right: M },
    head: [['PRODUCT', 'DETAILS', 'QTY', 'RATE', 'AMOUNT']],
    body: inv.items.map((it) => {
      const detailLines = []
      if (it.detail) detailLines.push(it.detail)
      if (it.bulkApplied) {
        // The bulk unit price rides in the saved snapshot (per-product or
        // brand combined) — shown here for reference; the charged amount is
        // the RATE column. Never recalculated.
        detailLines.push(
          it.bulkPrice != null
            ? `Bulk Price Applied · ${rupee ? money(it.bulkPrice) : pdfMoney(it.bulkPrice)} / piece`
            : 'Bulk Price Applied'
        )
      }
      return [
        it.name,
        detailLines.join('\n'),
        String(it.qty),
        rupee ? money(it.rate) : pdfMoney(it.rate),
        rupee ? money(it.amount) : pdfMoney(it.amount),
      ]
    }),
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: TEXT,
      lineColor: HAIRLINE,
      lineWidth: 0.15,
      cellPadding: { top: 2.4, bottom: 2.4, left: 1.5, right: 1.5 },
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5,
      textColor: CREAM,
      fillColor: INK,
      lineColor: GOLD,
      lineWidth: 0.5,
      cellPadding: { top: 3, bottom: 3, left: 1.5, right: 1.5 },
    },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head') return
      const item = inv.items[data.row.index]
      if (data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold'
        // Reserve room for the 12.7mm (~48px) thumbnail on the left of the name.
        if (thumbs[data.row.index]) data.cell.styles.cellPadding.left = 16.5
      }
      if (data.column.index === 1) {
        data.cell.styles.textColor = MUTED
        // The details cell may carry a “₹…/piece” bulk line — use the rupee
        // font so that glyph renders when the font is embedded.
        if (rupee && item?.bulkApplied) data.cell.styles.font = RUPEE_FONT
      }
      if ((data.column.index === 3 || data.column.index === 4) && rupee) {
        data.cell.styles.font = RUPEE_FONT
      }
    },
    didDrawCell: (data) => {
      // Product thumbnail inside the PRODUCT cell (left of the name).
      if (data.section !== 'body' || data.column.index !== 0) return
      const thumb = thumbs[data.row.index]
      if (!thumb) return
      const size = 12.7 // ~48px at 96dpi — matches the on-screen sheet
      const x = data.cell.x + 1.8
      const y = data.cell.y + (data.cell.height - size) / 2
      // Soft cream border frame (drawn just outside the image, like the sheet)
      doc.setDrawColor(...CREAM_BORDER).setLineWidth(0.5)
      doc.roundedRect(x - 0.35, y - 0.35, size + 0.7, size + 0.7, 0.8, 0.8, 'S')
      doc.addImage(thumb, 'JPEG', x, y, size, size)
    },
  })

  let ty = (doc.lastAutoTable?.finalY ?? tableStartY) + 6

  // ========================= BULK PRICING BAND ==============================
  // Optional — only when the saved order actually applied bulk pricing.
  if (inv.hasBulkPricing) {
    if (ty > H - 60) {
      doc.addPage()
      ty = M
    }
    const bandH = 12
    doc.setFillColor(...CREAM)
    doc.roundedRect(M, ty, CW, bandH, 1.5, 1.5, 'F')
    doc.setFillColor(...GOLD)
    doc.rect(M, ty, 1.4, bandH, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GOLD)
    doc.text('BULK PRICING APPLIED', M + 5, ty + 4.5)
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED)
    doc.text(
      'Special quantity pricing has been applied to this order based on the applicable bulk tier.',
      M + 5,
      ty + 8.5
    )
    ty += bandH + 6
  }

  // ============================ PRICE SUMMARY ===============================
  const sumW = 80
  const sumX = W - M - sumW
  if (ty > H - 55) {
    doc.addPage()
    ty = M
  }
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  doc.text('Subtotal', sumX, ty)
  drawMoney(doc, rupee, inv.subtotal, W - M, ty, { align: 'right' })
  ty += 6
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  doc.text('Delivery / Transport', sumX, ty)
  if (inv.delivery == null) {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
    doc.text('To be confirmed', W - M, ty, { align: 'right' })
  } else {
    drawMoney(doc, rupee, inv.delivery, W - M, ty, { align: 'right' })
  }
  ty += 5
  doc.setDrawColor(...GOLD).setLineWidth(0.4)
  doc.line(sumX, ty, W - M, ty)
  ty += 5.5
  doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...INK)
  doc.text('TOTAL', sumX, ty)
  drawMoney(doc, rupee, inv.total, W - M, ty, { align: 'right', size: 13, color: GOLD })
  ty += 11

  // ========================= PAYMENT + STATUS ===============================
  if (ty > H - 50) {
    doc.addPage()
    ty = M
  }
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GOLD)
  doc.text('PAYMENT METHOD', M, ty)
  doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...INK)
  doc.text(inv.paymentMethod || '', M, ty + 4.5)
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GOLD)
  doc.text('ORDER STATUS', W / 2, ty)
  doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...INK)
  doc.text(inv.status || '', W / 2, ty + 4.5)
  ty += 15

  // ============================== FOOTER ====================================
  if (ty > H - 45) {
    doc.addPage()
    ty = M + 4
  }
  doc.setDrawColor(...[218, 213, 202]).setLineWidth(0.2)
  doc.line(M, ty, W - M, ty)
  ty += 6.5
  doc.setFont('times', 'italic').setFontSize(11).setTextColor(...TEXT)
  doc.text(inv.company.thanks, W / 2, ty, { align: 'center' })
  ty += 6
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GOLD_LIGHT)
  if (inv.company.tagline) doc.text(inv.company.tagline, W / 2, ty, { align: 'center' })
  ty += 5
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED)
  const footContact = [inv.company.phone, inv.company.email].filter(Boolean).join('   ·   ')
  if (footContact) {
    doc.text(footContact, W / 2, ty, { align: 'center' })
    ty += 4.5
  }
  if (inv.company.address) {
    doc.text(inv.company.address, W / 2, ty, { align: 'center' })
    ty += 4.5
  }
  doc.text(inv.company.gstNote, W / 2, ty, { align: 'center' })
  ty += 3.5
  doc.text('This is a computer-generated invoice.', W / 2, ty, { align: 'center' })

  // Page footer on every page: invoice ref (left) + page numbers (right)
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED)
    if (inv.orderId) doc.text(`Invoice ${inv.orderId}`, M, H - 7)
    doc.text(`Page ${i} of ${pages}`, W - M, H - 7, { align: 'right' })
  }

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
  const logo = await loadLogo(logoUrl)
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

// Standalone A4 HTML document for the print window — mirrors the PDF layout
// exactly (browser fonts render the real ₹ glyph).
function renderPrintHtml(inv, logo) {
  const rows = inv.items
    .map((it) => {
      const details = []
      if (it.detail) details.push(`<span class="detail-main">${escapeHtml(it.detail)}</span>`)
      if (it.bulkApplied) details.push(`<span class="detail-bulk">Bulk Price Applied</span>`)
      const thumb = it.image
        ? `<img class="thumb" src="${escapeHtml(it.image)}" alt="" onerror="this.style.display='none'" />`
        : ''
      return `<tr>
        <td class="name">${thumb}<span>${escapeHtml(it.name)}</span></td>
        <td class="detail">${details.join('')}</td>
        <td class="num">${it.qty}</td>
        <td class="num">${formatINR(it.rate)}</td>
        <td class="num">${formatINR(it.amount)}</td>
      </tr>`
    })
    .join('')

  const billTo = []
  if (inv.customer.name) billTo.push(`<p class="customer">${escapeHtml(inv.customer.name)}</p>`)
  if (inv.customer.phone) billTo.push(`<p>${escapeHtml(inv.customer.phone)}</p>`)
  if (inv.customer.email) billTo.push(`<p>${escapeHtml(inv.customer.email)}</p>`)
  inv.addressLines.forEach((l) => billTo.push(`<p>${escapeHtml(l)}</p>`))

  const orderInfo = []
  if (inv.orderId) orderInfo.push(`<li><span>Order ID</span><strong>${escapeHtml(inv.orderId)}</strong></li>`)
  if (inv.date) orderInfo.push(`<li><span>Date</span><strong>${escapeHtml(inv.date)}</strong></li>`)
  if (inv.time) orderInfo.push(`<li><span>Time</span><strong>${escapeHtml(inv.time)}</strong></li>`)
  if (inv.paymentMethod) orderInfo.push(`<li><span>Payment</span><strong>${escapeHtml(inv.paymentMethod)}</strong></li>`)

  const contactBits = [inv.company.phone, inv.company.email].filter(Boolean).join('  ·  ')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(inv.orderId || '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; background: #fff; }
  .sheet { width: 210mm; min-height: 285mm; margin: 0 auto; padding: 14mm; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 12px; border-bottom: 1.2px solid #b8862b; }
  .brand { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
  .brand img { height: 38px; width: auto; object-fit: contain; }
  .brand-text .company { display: block; font-size: 17px; font-weight: 700; color: #111; }
  .brand-text .tagline { display: block; font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; color: #d4af37; margin-top: 3px; }
  .title { text-align: right; }
  .title h2 { font-size: 22px; letter-spacing: 0.18em; color: #111; font-weight: 700; }
  .title p { font-size: 8.5px; color: #666; margin-top: 3px; }
  .title p strong { color: #111; }
  .contact { font-size: 8px; color: #666; padding: 5px 0 0; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 7mm; }
  .card { background: #f8f4ec; border: 1px solid #d4af37; border-radius: 3px; padding: 4.5mm 5mm; }
  .card h3 { font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: #b8862b; margin-bottom: 3.5mm; }
  .card p { font-size: 9px; color: #222; line-height: 1.5; }
  .card p.customer { font-size: 11px; font-weight: 700; color: #111; }
  .card ul { list-style: none; }
  .card ul li { display: flex; justify-content: space-between; gap: 12px; font-size: 9px; color: #666; padding: 1.4mm 0; border-bottom: 1px solid rgba(184, 134, 43, 0.14); }
  .card ul li:last-child { border-bottom: none; }
  .card ul li strong { color: #111; font-weight: 600; text-align: right; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 7mm; }
  table.items th { background: #111; color: #f8f4ec; text-align: left; font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; padding: 3mm 2.5mm; border-bottom: 1.5px solid #b8862b; }
  table.items th.num, table.items td.num { text-align: right; }
  table.items td { padding: 2.6mm 2.5mm; font-size: 9px; border-bottom: 1px solid #ebe7de; vertical-align: top; }
  table.items td.name { font-weight: 700; color: #111; }
  table.items td.name img.thumb { width: 12.7mm; height: 12.7mm; object-fit: cover; border-radius: 1.5mm; margin-right: 2.5mm; vertical-align: middle; background: #f6f0e5; border: 1px solid #e8dcc3; }
  table.items td.detail { color: #666; }
  table.items td.detail .detail-main { display: block; }
  table.items td.detail .detail-bulk { display: inline-block; margin-top: 1.5mm; font-size: 8px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #b8862b; }
  .bulk-band { display: flex; align-items: baseline; gap: 10px; background: #f8f4ec; border-left: 3px solid #b8862b; border-radius: 2px; padding: 3.5mm 5mm; margin-top: 6mm; }
  .bulk-band strong { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #b8862b; white-space: nowrap; }
  .bulk-band span { font-size: 8.5px; color: #666; }
  .summary { width: 82mm; margin-left: auto; margin-top: 6mm; }
  .row { display: flex; justify-content: space-between; padding: 1.8mm 0; font-size: 9.5px; color: #666; }
  .row.grand { border-top: 1px solid #b8862b; margin-top: 2mm; padding-top: 3mm; font-size: 11px; font-weight: 700; color: #111; }
  .row.grand .amount { color: #b8862b; font-size: 13px; }
  .pay { display: flex; gap: 24mm; margin-top: 6mm; }
  .pay .label { font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: #b8862b; margin-bottom: 1.5mm; }
  .pay .value { font-size: 10px; font-weight: 700; color: #111; }
  .foot { text-align: center; margin-top: 10mm; padding-top: 6mm; border-top: 1px solid #dad5ca; }
  .foot .thanks { font-family: Georgia, serif; font-style: italic; font-size: 12px; color: #222; }
  .foot .tagline { font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; color: #d4af37; margin-top: 2.5mm; }
  .foot .contact-line { font-size: 8px; color: #666; margin-top: 2mm; }
  .foot .gst { font-size: 8px; color: #666; margin-top: 2.5mm; }
  .foot .generated { font-size: 8px; color: #666; margin-top: 1.5mm; }
  @page { size: A4; margin: 12mm; }
  @media print { body { background: #fff; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">
        ${logo ? `<img src="${logo.dataUrl}" alt="" />` : ''}
        <div class="brand-text">
          <span class="company">${escapeHtml(inv.company.name)}</span>
          ${inv.company.tagline ? `<span class="tagline">${escapeHtml(inv.company.tagline)}</span>` : ''}
        </div>
      </div>
      <div class="title">
        <h2>Invoice</h2>
        ${inv.orderId ? `<p>Invoice # <strong>${escapeHtml(inv.orderId)}</strong></p>` : ''}
        ${inv.date ? `<p>Date: ${escapeHtml(inv.date)}</p>` : ''}
        ${inv.time ? `<p>Time: ${escapeHtml(inv.time)}</p>` : ''}
      </div>
    </div>

    <p class="contact">${escapeHtml(contactBits)}</p>

    <div class="cards">
      <div class="card">
        <h3>Bill To</h3>
        ${billTo.join('')}
      </div>
      <div class="card">
        <h3>Order Information</h3>
        <ul>${orderInfo.join('')}</ul>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr><th>Product</th><th>Details</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5">No items recorded for this order.</td></tr>'}
      </tbody>
    </table>

    ${inv.hasBulkPricing
      ? `<div class="bulk-band"><strong>Bulk Pricing Applied</strong><span>Special quantity pricing has been applied to this order based on the applicable bulk tier.</span></div>`
      : ''}

    <div class="summary">
      <div class="row"><span>Subtotal</span><span>${formatINR(inv.subtotal)}</span></div>
      <div class="row"><span>Delivery / Transport</span><span>${inv.delivery == null ? 'To be confirmed' : formatINR(inv.delivery)}</span></div>
      <div class="row grand"><span>Total</span><span class="amount">${formatINR(inv.total)}</span></div>
    </div>

    <div class="pay">
      <div><p class="label">Payment Method</p><p class="value">${escapeHtml(inv.paymentMethod)}</p></div>
      <div><p class="label">Order Status</p><p class="value">${escapeHtml(inv.status)}</p></div>
    </div>

    <div class="foot">
      <p class="thanks">${escapeHtml(inv.company.thanks)}</p>
      ${inv.company.tagline ? `<p class="tagline">${escapeHtml(inv.company.tagline)}</p>` : ''}
      ${contactBits ? `<p class="contact-line">${escapeHtml(contactBits)}</p>` : ''}
      ${inv.company.address ? `<p class="contact-line">${escapeHtml(inv.company.address)}</p>` : ''}
      <p class="gst">${escapeHtml(inv.company.gstNote)}</p>
      <p class="generated">This is a computer-generated invoice.</p>
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
