// ============================================================================
// Invoice PDF / print — premium A4 document generation (no screenshots).
//
// DESIGN: luxury attar invoice for Hallmark of Excellence.
//   • Frame   — hairline gold page frame with a lighter inner outline
//   • Header  — logo (left) · brand name + tagline (centre) · gold INVOICE
//               title + invoice # / date / time (right), thin gold divider
//               and a centred contact bar below
//   • Cards   — BILL TO + ORDER INFORMATION (Order ID / Date / Time / Payment
//               / Status) side by side on a warm cream fill
//   • Table   — dark header, white rows, subtle separators, aspect-preserved
//               thumbnails, brand · size detail lines
//   • Summary — right-aligned Subtotal / Delivery / TOTAL (gold amount)
//   • Payment + coloured status pill, trust row, thank-you card, dark footer
//   • Multi-page: the table header repeats, totals stay together, and the
//     gold frame + dark footer are redrawn on every page.
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

// --- Palette (Hallmark Excellence luxury) ----------------------------------
const INK = [23, 21, 18] // #171512
const TEXT = [26, 24, 21] // #1A1815
const MUTED = [111, 106, 99] // #6F6A63
const GOLD = [184, 134, 43] // #B8862B
const GOLD_LIGHT = [206, 166, 86] // lighter gold for small accents
const CREAM = [247, 242, 232] // #F7F2E8
const CREAM_BORDER = [230, 220, 198] // #E6DCC6 — thumb frame
const HAIRLINE = [236, 231, 220] // #ECE7DC
const WHITE = [255, 255, 255]

// Real order-status colours (unknown statuses fall back to gold).
const STATUS_COLORS = {
  pending: GOLD,
  confirmed: [46, 125, 50],
  processing: [21, 101, 192],
  shipped: [21, 101, 192],
  delivered: [46, 125, 50],
  cancelled: [198, 40, 40],
}
function statusColor(status) {
  const key = String(status || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  return STATUS_COLORS[key] || STATUS_COLORS.pending
}

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

// Product thumbnail: downscaled to ≤128px; returns the full { dataUrl, w, h }
// so the table can fit it inside its frame WITHOUT stretching the aspect
// ratio. A row simply renders without a thumbnail when the image is missing.
function loadThumb(src) {
  return loadImageDataUrl(src, { maxSize: 128 })
}

// Fit a w×h image inside a size×size box, preserving aspect ratio (contain).
function containBox(w, h, size) {
  const scale = Math.min(size / w, size / h)
  const cw = w * scale
  const ch = h * scale
  return { w: cw, h: ch, x: (size - cw) / 2, y: (size - ch) / 2 }
}

// Trust row copy — mirrors the on-screen sheet.
const TRUST_ITEMS = [
  { title: '100% Original', sub: 'Authentic attars from trusted sources' },
  { title: 'Premium Quality', sub: 'Finest ingredients & long lasting' },
  { title: 'Secure Packaging', sub: 'Carefully packed for safe delivery' },
  { title: 'Customer Support', sub: "We're here to help you always" },
]

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
  const M = 14 // content margin
  const CW = W - M * 2 // content width 182

  // ============================= HEADER =====================================
  let brandX = M
  if (logo) {
    const logoW = 34
    const logoH = Math.max(9, Math.min(14, (logoW * logo.h) / logo.w))
    doc.addImage(logo.dataUrl, 'JPEG', M, 15.5, logoW, logoH)
    brandX = M + logoW + 7
  }
  // Brand name + tagline (centre)
  doc.setFont('times', 'bold').setFontSize(17).setTextColor(...INK)
  doc.text(inv.company.name, W / 2, 17.5, { align: 'center' })
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...GOLD)
  if (inv.company.tagline) {
    doc.text(inv.company.tagline.toUpperCase(), W / 2, 23, { align: 'center', charSpace: 1.2 })
  }

  // INVOICE title (right, gold)
  doc.setFont('times', 'bold').setFontSize(21).setTextColor(...GOLD)
  doc.text('INVOICE', W - M, 17.5, { align: 'right', charSpace: 2.5 })
  let ry = 26
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...TEXT)
  if (inv.orderId) {
    doc.text(`Invoice # ${inv.orderId}`, W - M, ry, { align: 'right' })
    ry += 4.4
  }
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED)
  if (inv.date) {
    doc.text(`Date: ${inv.date}`, W - M, ry, { align: 'right' })
    ry += 4.4
  }
  if (inv.time) doc.text(`Time: ${inv.time}`, W - M, ry, { align: 'right' })

  // Thin gold divider + centred contact bar (real config values only)
  doc.setDrawColor(...GOLD).setLineWidth(0.7)
  doc.line(M, 41, W - M, 41)
  const contactBits = [inv.company.phone, inv.company.email].filter(Boolean)
  if (contactBits.length > 0) {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED)
    doc.text(contactBits.join('   ·   '), W / 2, 46, { align: 'center' })
  }

  // ========================= BILL TO / ORDER INFO ===========================
  const cardGap = 8
  const cardW = (CW - cardGap) / 2 // 87
  const padX = 5
  const padY = 4.2

  // Measure BILL TO content
  const billLines = []
  if (inv.customer.name) billLines.push({ text: inv.customer.name, size: 10.5, style: 'bold', color: INK })
  if (inv.customer.phone) billLines.push({ text: inv.customer.phone, size: 8.5, style: 'normal', color: TEXT })
  if (inv.customer.email) billLines.push({ text: inv.customer.email, size: 8.5, style: 'normal', color: TEXT })
  for (const line of inv.addressLines) {
    const wrapped = doc.splitTextToSize(line || '', cardW - padX * 2)
    for (const l of wrapped) billLines.push({ text: l, size: 8.5, style: 'normal', color: MUTED })
  }
  let billH = 10 // heading + gap
  billLines.forEach((l) => {
    billH += l.size * 0.5 + (l.style === 'bold' ? 1.7 : 0.9)
  })

  // ORDER INFORMATION rows (real values only) — including the real status
  const orderRows = []
  if (inv.orderId) orderRows.push(['Order ID', inv.orderId])
  if (inv.date) orderRows.push(['Date', inv.date])
  if (inv.time) orderRows.push(['Time', inv.time])
  if (inv.paymentMethod) orderRows.push(['Payment', inv.paymentMethod])
  if (inv.status) orderRows.push(['Status', inv.status])
  const orderH = 10 + orderRows.length * 6.4

  const cardH = Math.max(billH, orderH) + padY * 2
  let y = 52

  // Draw the two cards
  doc.setFillColor(...CREAM)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, cardW, cardH, 2.5, 2.5, 'FD')
  doc.roundedRect(M + cardW + cardGap, y, cardW, cardH, 2.5, 2.5, 'FD')

  // BILL TO text
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GOLD)
  doc.text('BILL TO', M + padX, y + padY + 3.5)
  let by = y + padY + 8
  for (const l of billLines) {
    doc.setFont('helvetica', l.style).setFontSize(l.size).setTextColor(...l.color)
    doc.text(l.text, M + padX, by)
    by += l.size * 0.5 + (l.style === 'bold' ? 1.7 : 0.9)
  }

  // ORDER INFORMATION text
  const infoRight = M + cardW + cardGap + cardW - padX
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GOLD)
  doc.text('ORDER INFORMATION', M + cardW + cardGap + padX, y + padY + 3.5)
  let oy = y + padY + 8
  for (const [label, value] of orderRows) {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    doc.text(label, M + cardW + cardGap + padX, oy)
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXT)
    doc.text(value, infoRight, oy, { align: 'right' })
    oy += 6.4
  }

  // ============================= ITEMS TABLE ================================
  const tableStartY = y + cardH + 5
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: M, right: M },
    head: [['PRODUCT', 'DETAILS', 'QTY', 'RATE', 'AMOUNT']],
    body: inv.items.map((it) => {
      const detailLines = []
      if (it.detail) detailLines.push(it.detail)
      // PACK purchase — show pack name + packs/pieces breakdown so the PDF
      // never confuses packs with pieces.
      if (it.pack) {
        const packLines = [it.pack.name]
        if (it.pack.packs != null) {
          packLines.push(`${it.pack.packs} pack${it.pack.packs === 1 ? '' : 's'} · ${it.pack.pieces} pieces`)
        }
        if (it.pack.price != null) {
          packLines.push(rupee ? money(it.pack.price) : pdfMoney(it.pack.price) + ' / pack')
        }
        detailLines.push(packLines.join('\n'))
      }
      return [
        it.name,
        detailLines.join('\n'),
        // Qty column: actual pieces for a pack line, plain qty otherwise.
        it.pack ? String(it.pack.pieces ?? it.qty) : String(it.qty),
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
      cellPadding: { top: 2.6, bottom: 2.6, left: 1.5, right: 1.5 },
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
        // Reserve room for the 13mm thumbnail frame on the left of the name.
        if (thumbs[data.row.index]) data.cell.styles.cellPadding.left = 17
      }
      if (data.column.index === 1) {
        data.cell.styles.textColor = MUTED
      }
      if ((data.column.index === 3 || data.column.index === 4) && rupee) {
        data.cell.styles.font = RUPEE_FONT
      }
    },
    didDrawCell: (data) => {
      // Product thumbnail inside the PRODUCT cell (left of the name),
      // fitted inside the frame with its aspect ratio preserved (contain).
      if (data.section !== 'body' || data.column.index !== 0) return
      const thumb = thumbs[data.row.index]
      if (!thumb) return
      const size = 13 // ~49px frame
      const fx = data.cell.x + 1.8
      const fy = data.cell.y + (data.cell.height - size) / 2
      // Soft cream border frame
      doc.setFillColor(...CREAM)
      doc.setDrawColor(...CREAM_BORDER)
      doc.setLineWidth(0.4)
      doc.roundedRect(fx, fy, size, size, 1.4, 1.4, 'FD')
      const box = containBox(thumb.w, thumb.h, size - 2.4)
      doc.addImage(thumb.dataUrl, 'JPEG', fx + 1.2 + box.x, fy + 1.2 + box.y, box.w, box.h)
    },
  })

  let ty = (doc.lastAutoTable?.finalY ?? tableStartY) + 6

  // ============================ PRICE SUMMARY ===============================
  const sumW = 78
  const sumX = W - M - sumW
  if (ty > H - 58) {
    doc.addPage()
    ty = M
  }
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  doc.text('Subtotal', sumX, ty)
  drawMoney(doc, rupee, inv.subtotal, W - M, ty, { align: 'right' })
  ty += 5.5
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  doc.text('Delivery / Transport', sumX, ty)
  if (inv.delivery == null) {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
    doc.text('To be confirmed', W - M, ty, { align: 'right' })
  } else {
    drawMoney(doc, rupee, inv.delivery, W - M, ty, { align: 'right' })
  }
  ty += 4.5
  doc.setDrawColor(...GOLD).setLineWidth(0.4)
  doc.line(sumX, ty, W - M, ty)
  ty += 5
  doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...INK)
  doc.text('TOTAL', sumX, ty)
  drawMoney(doc, rupee, inv.total, W - M, ty, { align: 'right', size: 13, color: GOLD })
  ty += 10

  // ======================= PAYMENT + STATUS (pill) ==========================
  if (ty > H - 52) {
    doc.addPage()
    ty = M
  }
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GOLD)
  doc.text('PAYMENT METHOD', M, ty)
  doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...INK)
  doc.text(inv.paymentMethod || '', M, ty + 4.5)

  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GOLD)
  doc.text('ORDER STATUS', W / 2, ty)
  // Status pill — colour derived from the REAL status text
  const statusText = inv.status || ''
  const statusC = statusColor(statusText)
  doc.setFont('helvetica', 'bold').setFontSize(9)
  const pillTextW = doc.getTextWidth(statusText)
  const pillW = pillTextW + 8
  const pillH = 6.5
  const pillX = W / 2
  const pillY = ty + 2
  doc.setFillColor(...statusC)
  doc.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, 'F')
  doc.setTextColor(...WHITE)
  doc.text(statusText, pillX + pillW / 2, pillY + pillH / 2 + 1, { align: 'center' })
  ty += 13

  // ============================= TRUST ROW ==================================
  if (ty > H - 68) {
    doc.addPage()
    ty = M
  }
  const trustGap = 6
  const trustCol = (CW - trustGap * 3) / 4 // 41
  const trustItems = TRUST_ITEMS // brand promises — always shown (matches the screen sheet)
  // Measure sub-line wrapping so all four columns stay aligned
  let trustH = 8
  trustItems.forEach((t) => {
    const lines = doc.splitTextToSize(t.sub, trustCol - 6)
    trustH = Math.max(trustH, 8 + lines.length * 4.2)
  })
  trustItems.forEach((t, i) => {
    const cx = M + i * (trustCol + trustGap)
    doc.setFillColor(...GOLD)
    doc.circle(cx + 2, ty + 2, 1.7, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...INK)
    doc.text(t.title, cx + 6, ty + 1.2)
    const lines = doc.splitTextToSize(t.sub, trustCol - 6)
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED)
    doc.text(lines, cx + 6, ty + 5)
  })
  ty += trustH + 5

  // =========================== THANK-YOU CARD ===============================
  if (ty > H - 62) {
    doc.addPage()
    ty = M
  }
  const thanksH = 25
  doc.setFillColor(...CREAM)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, ty, CW, thanksH, 3, 3, 'FD')
  doc.setFont('times', 'bold').setFontSize(13).setTextColor(...GOLD)
  doc.text('Thank You!', W / 2, ty + 8, { align: 'center' })
  doc.setFont('times', 'italic').setFontSize(10.5).setTextColor(...TEXT)
  doc.text(inv.company.thanks, W / 2, ty + 14.5, { align: 'center' })
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
  doc.text('We truly appreciate your trust in our attars.', W / 2, ty + 19.5, { align: 'center' })
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GOLD)
  doc.text(`— Team ${inv.company.name}`, W / 2, ty + 24, { align: 'center' })
  ty += thanksH + 6

  // ================== PAGE FRAME + DARK FOOTER (every page) =================
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)

    // Hairline gold page frame + lighter inner outline
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.3)
    doc.roundedRect(M - 3, M - 3, CW + 6, H - (M - 3) * 2, 2, 2, 'S')
    doc.setDrawColor(...GOLD_LIGHT)
    doc.setLineWidth(0.15)
    doc.roundedRect(M - 1.7, M - 1.7, CW + 3.4, H - (M - 1.7) * 2, 1.5, 1.5, 'S')

    // Dark footer band (bottom)
    const bandY = H - M - 18
    const bandH = 16
    doc.setFillColor(...INK)
    doc.roundedRect(M - 1, bandY, CW + 2, bandH, 2, 2, 'F')
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...CREAM)
    if (inv.orderId) doc.text(`Invoice ${inv.orderId}`, M + 2, bandY + 5)
    doc.text(`Page ${i} of ${pages}`, W - M - 2, bandY + 5, { align: 'right' })
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...GOLD_LIGHT)
    doc.text(inv.company.gstNote, W / 2, bandY + 10.5, { align: 'center' })
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...CREAM)
    doc.text(`© ${inv.company.name}. All rights reserved.`, W / 2, bandY + 15, { align: 'center' })
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
      // PACK purchase — show pack name + packs/pieces breakdown.
      if (it.pack) {
        const packBits = [it.pack.name]
        if (it.pack.packs != null) {
          packBits.push(`${it.pack.packs} pack${it.pack.packs === 1 ? '' : 's'} · ${it.pack.pieces} pieces`)
        }
        if (it.pack.price != null) packBits.push(formatINR(it.pack.price) + ' / pack')
        details.push(`<span class="detail-pack">${escapeHtml(packBits.join(' · '))}</span>`)
      }
      const thumb = it.image
        ? `<span class="thumb-frame"><img class="thumb" src="${escapeHtml(it.image)}" alt="" onerror="this.style.display='none'" /></span>`
        : ''
      return `<tr>
        <td class="name">${thumb}<span>${escapeHtml(it.name)}</span></td>
        <td class="detail">${details.join('')}</td>
        <td class="num">${it.pack ? (it.pack.pieces ?? it.qty) : it.qty}</td>
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
  if (inv.status) orderInfo.push(`<li><span>Status</span><strong>${escapeHtml(inv.status)}</strong></li>`)

  const contactBits = [inv.company.phone, inv.company.email].filter(Boolean).join('   ·   ')
  const statusCls = String(inv.status || 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'pending'

  const trust = `
    <div class="trust">
      <div class="trust-item"><span class="trust-icon">✓</span><div><strong>100% Original</strong><span>Authentic attars from trusted sources</span></div></div>
      <div class="trust-item"><span class="trust-icon">◆</span><div><strong>Premium Quality</strong><span>Finest ingredients &amp; long lasting</span></div></div>
      <div class="trust-item"><span class="trust-icon">◈</span><div><strong>Secure Packaging</strong><span>Carefully packed for safe delivery</span></div></div>
      <div class="trust-item"><span class="trust-icon">✦</span><div><strong>Customer Support</strong><span>We're here to help you always</span></div></div>
    </div>`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(inv.orderId || '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1815; background: #fff; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; }
  .frame { position: relative; margin: 6mm; padding: 12mm; border: 1px solid rgba(184,134,43,.45); outline: 1px solid rgba(184,134,43,.14); outline-offset: 3px; }
  .corner { position: absolute; width: 7mm; height: 7mm; border: 0 solid #b8862b; }
  .corner.tl { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; }
  .corner.tr { top: -1px; right: -1px; border-top-width: 2px; border-right-width: 2px; }
  .corner.bl { bottom: -1px; left: -1px; border-bottom-width: 2px; border-left-width: 2px; }
  .corner.br { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; }
  .head { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 14px; padding-bottom: 3mm; border-bottom: 1.2px solid #b8862b; }
  .brand img { height: 11mm; width: auto; object-fit: contain; }
  .brand-center { text-align: center; }
  .brand-center .company { display: block; font-family: Georgia, serif; font-size: 18px; font-weight: 700; color: #171512; }
  .brand-center .tagline { display: block; font-size: 7px; letter-spacing: .22em; text-transform: uppercase; color: #b8862b; margin-top: 1mm; }
  .title { text-align: right; }
  .title h2 { font-family: Georgia, serif; font-size: 21px; letter-spacing: .18em; color: #b8862b; font-weight: 700; }
  .title p { font-size: 8.5px; color: #6f6a63; margin-top: 1.2mm; white-space: nowrap; }
  .title p strong { color: #171512; }
  .contact { display: flex; justify-content: center; gap: 7mm; padding: 2mm 0 0; font-size: 8px; color: #6f6a63; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; margin-top: 7mm; }
  .card { background: #f7f2e8; border: 1px solid rgba(184,134,43,.4); border-radius: 6px; padding: 4.5mm 5mm; }
  .card h3 { font-size: 7.5px; letter-spacing: .24em; text-transform: uppercase; color: #b8862b; margin-bottom: 3mm; padding-bottom: 2mm; border-bottom: 1px solid rgba(184,134,43,.25); }
  .card p { font-size: 9px; color: #1a1815; line-height: 1.5; }
  .card p.customer { font-size: 11px; font-weight: 700; color: #171512; }
  .card ul { list-style: none; }
  .card ul li { display: flex; justify-content: space-between; gap: 12px; font-size: 8.5px; color: #6f6a63; padding: 1.3mm 0; border-bottom: 1px solid rgba(184,134,43,.16); }
  .card ul li:last-child { border-bottom: none; }
  .card ul li strong { color: #171512; font-weight: 700; text-align: right; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 7mm; }
  table.items th { background: #171512; color: #f7f2e8; text-align: left; font-size: 7.5px; letter-spacing: .14em; text-transform: uppercase; padding: 2.5mm 2.5mm; border-bottom: 1.5px solid #b8862b; }
  table.items th.num, table.items td.num { text-align: right; }
  table.items td { padding: 2.5mm 2.5mm; font-size: 8.5px; border-bottom: 1px solid #ece7dc; vertical-align: top; }
  table.items tbody tr:nth-child(even) { background: #fbf9f4; }
  table.items td.name { font-weight: 700; color: #171512; }
  table.items td.name .thumb-frame { display: inline-flex; align-items: center; justify-content: center; width: 12mm; height: 12mm; background: #f7f2e8; border: 1px solid #e6dcc6; border-radius: 1.5mm; overflow: hidden; margin-right: 2.5mm; vertical-align: middle; }
  table.items td.name img.thumb { width: 100%; height: 100%; object-fit: contain; border-radius: 1mm; }
  table.items td.detail { color: #6f6a63; }
  table.items td.detail .detail-main { display: block; }
  .lower { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-top: 7mm; }
  .summary { width: 78mm; }
  .row { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 9px; color: #6f6a63; }
  .row span:last-child { color: #1a1815; }
  .row.grand { border-top: 1.2px solid #b8862b; margin-top: 1.5mm; padding-top: 2.5mm; font-size: 10.5px; font-weight: 700; color: #171512; }
  .row.grand .amount { color: #b8862b; font-size: 13px; }
  .pay { display: flex; gap: 10mm; }
  .pay .label { font-size: 7.5px; letter-spacing: .18em; text-transform: uppercase; color: #b8862b; margin-bottom: 1.2mm; }
  .pay .value { font-size: 9.5px; font-weight: 700; color: #171512; }
  .pill { display: inline-block; padding: 1mm 2.5mm; border-radius: 999px; font-size: 8px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; background: rgba(184,134,43,.12); color: #8a5f1e; border: 1px solid rgba(184,134,43,.35); }
  .pill.confirmed, .pill.delivered { background: rgba(46,125,50,.1); color: #2e7d32; border-color: rgba(46,125,50,.35); }
  .pill.processing, .pill.shipped { background: rgba(21,101,192,.1); color: #1565c0; border-color: rgba(21,101,192,.35); }
  .pill.cancelled { background: rgba(198,40,40,.1); color: #c62828; border-color: rgba(198,40,40,.35); }
  .trust { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 4mm; margin-top: 7mm; padding-top: 5mm; border-top: 1px solid #ece7dc; }
  .trust-item { display: flex; align-items: flex-start; gap: 2mm; }
  .trust-icon { display: inline-flex; align-items: center; justify-content: center; width: 6.5mm; height: 6.5mm; border-radius: 50%; background: #f7f2e8; border: 1px solid rgba(184,134,43,.35); color: #b8862b; font-size: 7px; flex-shrink: 0; }
  .trust-item div { display: flex; flex-direction: column; }
  .trust-item strong { font-size: 7.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #171512; line-height: 1.35; }
  .trust-item div span { font-size: 7.5px; color: #6f6a63; line-height: 1.45; }
  .thanks { margin-top: 7mm; padding: 5mm; background: #f7f2e8; border: 1px solid rgba(184,134,43,.4); border-radius: 6px; text-align: center; }
  .thanks .t { font-family: Georgia, serif; font-size: 15px; font-weight: 700; color: #b8862b; margin-bottom: 2mm; }
  .thanks .line { font-family: Georgia, serif; font-style: italic; font-size: 11px; color: #171512; }
  .thanks .sub { font-size: 8.5px; color: #6f6a63; margin-top: 1.2mm; }
  .thanks .sign { font-size: 8px; font-weight: 700; color: #b8862b; margin-top: 2mm; }
  .foot { margin-top: 6mm; padding: 4mm; background: #171512; border-radius: 5px; text-align: center; }
  .foot p { font-size: 8px; color: rgba(247,242,232,.75); line-height: 1.7; }
  .foot p:first-child { color: rgba(184,134,43,.9); }
  /* The frame's own margin (6mm) + padding (12mm) provide the ~18mm safe
     page margin, so @page must NOT add more — a 210mm sheet inside 12mm
     @page margins would measure 234mm and clip the gold frame's right edge
     in real print / Save-as-PDF. */
  @page { size: A4; margin: 0; }
  @media print { body { background: #fff; } .frame { break-inside: auto; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="frame">
      <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>

      <div class="head">
        <div class="brand">${logo ? `<img src="${logo.dataUrl}" alt="" />` : ''}</div>
        <div class="brand-center">
          <span class="company">${escapeHtml(inv.company.name)}</span>
          ${inv.company.tagline ? `<span class="tagline">${escapeHtml(inv.company.tagline)}</span>` : ''}
        </div>
        <div class="title">
          <h2>Invoice</h2>
          ${inv.orderId ? `<p>Invoice # <strong>${escapeHtml(inv.orderId)}</strong></p>` : ''}
          ${inv.date ? `<p>Date: ${escapeHtml(inv.date)}</p>` : ''}
          ${inv.time ? `<p>Time: ${escapeHtml(inv.time)}</p>` : ''}
        </div>
      </div>

      ${contactBits ? `<div class="contact"><span>${escapeHtml(contactBits)}</span></div>` : ''}

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

      <div class="lower">
        <div class="summary">
          <div class="row"><span>Subtotal</span><span>${formatINR(inv.subtotal)}</span></div>
          <div class="row"><span>Delivery / Transport</span><span>${inv.delivery == null ? 'To be confirmed' : formatINR(inv.delivery)}</span></div>
          <div class="row grand"><span>Total</span><span class="amount">${formatINR(inv.total)}</span></div>
        </div>
        <div class="pay">
          <div><p class="label">Payment Method</p><p class="value">${escapeHtml(inv.paymentMethod)}</p></div>
          <div><p class="label">Order Status</p><p class="value"><span class="pill ${statusCls}">${escapeHtml(inv.status)}</span></p></div>
        </div>
      </div>

      ${trust}

      <div class="thanks">
        <p class="t">Thank You!</p>
        <p class="line">${escapeHtml(inv.company.thanks)}</p>
        <p class="sub">We truly appreciate your trust in our attars.</p>
        <p class="sign">— Team ${escapeHtml(inv.company.name)}</p>
      </div>

      <div class="foot">
        <p>${escapeHtml(inv.company.gstNote)}</p>
        <p>© ${escapeHtml(inv.company.name)}. All rights reserved.</p>
      </div>
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
