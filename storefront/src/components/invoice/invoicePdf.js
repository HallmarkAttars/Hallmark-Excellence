// ============================================================================
// Invoice PDF / print — premium A4 document generation (no screenshots).
//
// DESIGN: luxury attar invoice for Hallmark of Excellence.
//   • Frame   — thin DOUBLE gold page border (outer line + inner hairline)
//               with gold diamond accents at the four corners
//   • Header  — logo (left) · two-line serif brand + tagline (centre) ·
//               dynamic INVOICE / ESTIMATE title + #order / date / time
//               (right), thin gold divider with the contact strip (phone ·
//               email · website) and the GST / copyright lines below
//   • Cards   — BILL TO + ORDER INFORMATION (Order ID / Date / Time / Payment
//               / Status) side by side on a warm cream fill
//   • Table   — dark header, white rows, subtle separators, aspect-preserved
//               thumbnails, brand · size detail lines
//   • Summary — right-aligned Subtotal / Delivery / TOTAL (gold amount)
//   • Thanks  — gold-bordered thank-you card, then a "Page i of n" footer
//               flanked by gold rules + dots, redrawn on every page
//   • Multi-page: the table header repeats, totals stay together, and the
//     gold frame + page number are redrawn on every page.
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
  invoiceBrandLines,
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

// Text width in mm at the CURRENT font family/style/size. charSpace is added
// manually because jsPDF's getTextWidth ignores it, and its right-aligned
// charSpace drawing can extend ~1 charSpace past the anchor (which previously
// clipped the last letter of the INVOICE title against the gold frame).
function textWidthMm(doc, text, { charSpace = 0 } = {}) {
  const base = doc.getTextWidth(text)
  return charSpace > 0 ? base + charSpace * Math.max(0, text.length - 1) : base
}

// Shrink the current font size until `text` fits `maxWidth` mm (never below
// minSize). Returns the fitting size; the document is left with it applied.
// Used everywhere fixed-right-margin text could otherwise overflow the A4
// page or collide with its neighbours (header right block, cards, title).
export function fitTextToWidth(
  doc,
  text,
  maxWidth,
  { size = 9, minSize = 5, charSpace = 0 } = {}
) {
  let s = size
  doc.setFontSize(s)
  while (s > minSize && textWidthMm(doc, text, { charSpace }) > maxWidth) {
    s -= 0.5
    doc.setFontSize(s)
  }
  return s
}

// Font for the header's right meta lines (#order / Date / Time): bold for the
// order-id line, normal for the rest. Returns whether it is the order-id line
// so the caller can style it consistently. Shared by the measurement and draw
// loops so the fit math always uses the same metrics as the draw.
function applyRightMetaFont(doc, line) {
  const isOrderId = line.startsWith('#')
  doc.setFont('helvetica', isOrderId ? 'bold' : 'normal')
  doc.setFontSize(isOrderId ? 8 : 7.5)
  return isOrderId
}

// Small filled diamond — the gold corner accent on the page frame. Drawn as
// two triangles (jsPDF 4.x has no translate/rotate helpers, so the shape is
// pure geometry).
function drawDiamond(doc, cx, cy, half) {
  doc.setFillColor(...GOLD)
  doc.triangle(cx, cy - half, cx - half, cy, cx, cy + half, 'F')
  doc.triangle(cx, cy + half, cx + half, cy, cx, cy - half, 'F')
}

// Product thumbnail frame (mm) and the items table's vertical cell padding.
// These drive the minimum row height: a row must always be tall enough to
// contain its thumbnail frame, otherwise the image drawn centred in the cell
// spills over the row edges into the rows above/below.
const THUMB_FRAME = 13 // ~49px frame
const THUMB_CELL_PAD = 3.2 // must match styles.cellPadding top/bottom

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
  const r1 = (n) => Math.round(n * 10) / 10 // one-decimal rounding (exact 182mm column sum)

  // ============================= HEADER =====================================
  // Layout: logo (left) · two-line brand name + tagline (centre) · INVOICE /
  // ESTIMATE + #order / date / time (right). The centred brand and the right
  // block share the same vertical band, so each is shrink-fit to a MEASURED
  // width: a very long order id can never shove the company name out of the
  // page, and the right-aligned title keeps a deliberate 0.75mm inset because
  // jsPDF's charSpace extends right-aligned text ~1 charSpace past its anchor
  // (that previously clipped the last letter against the gold frame).
  const docTitle = inv.documentType || 'INVOICE'
  // The premium header brand title (AREES / PERFUMES) — falls back to the
  // legal company name when no brand title is configured.
  const brandTitle = inv.company.brandTitle || inv.company.name
  let brandX = M
  if (logo) {
    // Taller, vertically-centred logo inside the 19→37mm header band — the
    // previous 15.5mm placement crammed the whole header against the top of
    // the sheet.
    const logoW = 36
    const logoH = Math.max(10, Math.min(18, (logoW * logo.h) / logo.w))
    doc.addImage(logo.dataUrl, 'JPEG', M, 19, logoW, logoH)
    brandX = M + logoW + 7
  }

  // Right header block: #order / Date / Time — capped at a fixed width so its
  // left edge can never collide with the centred brand name. The brand's
  // centre budget uses the block's ACTUAL natural width (capped), so normal
  // invoices keep the company name at full 24pt and only genuinely long ids
  // / dates trigger shrink-fit.
  const MAX_RIGHT_BLOCK = 62 // mm
  const rightMeta = []
  if (inv.orderId) rightMeta.push(`#${inv.orderId}`)
  if (inv.date) rightMeta.push(`Date : ${inv.date}`)
  if (inv.time) rightMeta.push(`Time : ${inv.time}`)
  let naturalRightW = 0
  for (const line of rightMeta) {
    applyRightMetaFont(doc, line)
    naturalRightW = Math.max(naturalRightW, textWidthMm(doc, line))
  }
  const rightBlockW = Math.min(MAX_RIGHT_BLOCK, naturalRightW)
  const rightBlockLeft = W - M - rightBlockW

  // INVOICE / ESTIMATE title (right, gold) — modest charSpace + a 1mm inset
  // (≥ the charSpace) keeps the last letter safely inside the gold page frame
  // even with jsPDF's right-aligned charSpace quirk.
  doc.setFont('times', 'bold').setFontSize(21).setTextColor(...GOLD)
  fitTextToWidth(doc, docTitle, MAX_RIGHT_BLOCK, { size: 21, minSize: 13, charSpace: 1 })
  const titleLeftEdge = W - M - 1 - textWidthMm(doc, docTitle, { charSpace: 1 })
  doc.text(docTitle, W - M - 1, 30, { align: 'right', charSpace: 1 })

  // Brand name (centre) — two stacked serif lines (AREES / PERFUMES),
  // shrink-fit to the LONGEST line inside the band bounded by the left edge
  // and the tightest of the title / right meta block (with a 2mm gap); stays
  // perfectly centred whenever it fits.
  const brandLines = invoiceBrandLines(brandTitle)
  const brandLongest = brandLines.reduce((a, b) => (b.length > a.length ? b : a), '')
  const centerRightBound = Math.min(rightBlockLeft, titleLeftEdge)
  const centerMax = Math.max(20, Math.min(W / 2 - brandX, centerRightBound - 2 - W / 2) * 2)
  doc.setFont('times', 'bold').setFontSize(24).setTextColor(...INK)
  fitTextToWidth(doc, brandLongest, centerMax, { size: 24, minSize: 12 })
  doc.text(brandLines[0], W / 2, 30, { align: 'center' })
  if (brandLines[1]) doc.text(brandLines[1], W / 2, 36.5, { align: 'center' })
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GOLD)
  if (inv.company.tagline) {
    const tagline = inv.company.tagline.toUpperCase()
    // Tagline baseline 42.5 sits between the Date (43) and Time (47.5) meta
      // lines; the horizontal centre band (bounded by the right block's left
      // edge) keeps them apart, and long order ids shrink the band instead of
      // colliding.
    fitTextToWidth(doc, tagline, centerMax, { size: 9, minSize: 6, charSpace: 1.1 })
    doc.text(tagline, W / 2, 42.5, { align: 'center', charSpace: 1.1 })
  }

  // Gold decorative divider + diamond under the subtitle. Drawn as GRAPHICS
  // (never text) so it stays clear of the header text-containment checks and
  // can never be mistaken for a label; centred, well inside the right meta
  // block's left edge (x ≥ 174), so nothing can collide.
  doc.setDrawColor(...GOLD).setLineWidth(0.3)
  doc.line(W / 2 - 10, 47, W / 2 - 3.2, 47)
  doc.line(W / 2 + 3.2, 47, W / 2 + 10, 47)
  drawDiamond(doc, W / 2, 47, 1.1)

  // #order / Date / Time (right) — each line shrink-fits within the cap.
  let ry = 38.5
  for (const line of rightMeta) {
    const isOrderId = applyRightMetaFont(doc, line)
    doc.setTextColor(...(isOrderId ? TEXT : MUTED))
    fitTextToWidth(doc, line, MAX_RIGHT_BLOCK, { size: isOrderId ? 8 : 7.5, minSize: 5.5 })
    doc.text(line, W - M, ry, { align: 'right' })
    ry += 4.5
  }

  // Thin gold divider + centred contact strip (real config values only). The
  // GST / copyright legal lines sit quietly underneath on the plain page —
  // the old dark footer band has been removed.
  doc.setDrawColor(...GOLD).setLineWidth(0.7)
  doc.line(M, 56, W - M, 56)
  const contactBits = [inv.company.phone, inv.company.email, inv.company.website].filter(Boolean)
  if (contactBits.length > 0) {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED)
    doc.text(contactBits.join('   ·   '), W / 2, 61.5, { align: 'center' })
  }
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...MUTED)
  if (inv.company.gstNote) {
    doc.text(inv.company.gstNote, W / 2, 66, { align: 'center' })
  }
  doc.text(`© ${inv.company.name}. All rights reserved.`, W / 2, 70, { align: 'center' })

  // ========================= BILL TO / ORDER INFO ===========================
  const cardGap = 8
  const cardW = (CW - cardGap) / 2 // 87
  const padX = 6
  const padY = 6

  // Measure BILL TO content
  const billLines = []
  if (inv.customer.name) billLines.push({ text: inv.customer.name, size: 10.5, style: 'bold', color: INK })
  if (inv.customer.phone) billLines.push({ text: inv.customer.phone, size: 8.5, style: 'normal', color: TEXT })
  if (inv.customer.email) billLines.push({ text: inv.customer.email, size: 8.5, style: 'normal', color: TEXT })
  for (const line of inv.addressLines) {
    const wrapped = doc.splitTextToSize(line || '', cardW - padX * 2)
    for (const l of wrapped) billLines.push({ text: l, size: 8.5, style: 'normal', color: MUTED })
  }
  let billH = 12 // heading + gap
  billLines.forEach((l) => {
    billH += l.size * 0.5 + (l.style === 'bold' ? 2.2 : 1.2)
  })

  // ORDER INFORMATION rows (real values only) — including the real status
  const orderRows = []
  if (inv.orderId) orderRows.push(['Order ID', inv.orderId])
  if (inv.date) orderRows.push(['Date', inv.date])
  if (inv.time) orderRows.push(['Time', inv.time])
  if (inv.paymentMethod) orderRows.push(['Payment', inv.paymentMethod])
  if (inv.status) orderRows.push(['Status', inv.status])
  const orderH = 14 + orderRows.length * 7

  const cardH = Math.max(billH, orderH) + padY * 2
  let y = 78

  // Draw the two cards
  doc.setFillColor(...CREAM)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, cardW, cardH, 2.5, 2.5, 'FD')
  doc.roundedRect(M + cardW + cardGap, y, cardW, cardH, 2.5, 2.5, 'FD')

  // BILL TO text
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GOLD)
  doc.text('BILL TO', M + padX, y + padY + 4.5)
  let by = y + padY + 10
  for (const l of billLines) {
    doc.setFont('helvetica', l.style).setFontSize(l.size).setTextColor(...l.color)
    // Shrink-fit keeps a very long name/line inside the card's width.
    fitTextToWidth(doc, l.text, cardW - padX * 2, { size: l.size, minSize: 6 })
    doc.text(l.text, M + padX, by)
    by += l.size * 0.5 + (l.style === 'bold' ? 2.2 : 1.2)
  }

  // ORDER INFORMATION text
  const infoRight = M + cardW + cardGap + cardW - padX
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GOLD)
  doc.text('ORDER INFORMATION', M + cardW + cardGap + padX, y + padY + 4.5)
  let oy = y + padY + 10
  for (const [label, value] of orderRows) {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    doc.text(label, M + cardW + cardGap + padX, oy)
    // Shrink-fit the value so it never collides with its label or the
    // card's right edge — important for very long order ids.
    const labelW = doc.getTextWidth(label)
    const maxValueW = infoRight - (M + cardW + cardGap + padX + labelW) - 3
    doc.setFont('helvetica', 'bold').setTextColor(...TEXT)
    fitTextToWidth(doc, value, maxValueW, { size: 8.5, minSize: 5.5 })
    doc.text(value, infoRight, oy, { align: 'right' })
    oy += 7
  }

  // ============================= ITEMS TABLE ================================
  const tableStartY = y + cardH + 7
  autoTable(doc, {
    startY: tableStartY,
    // Explicit bottom margin keeps the last row clear of the per-page page
    // number (drawn at H-15) on dense multi-page invoices — the default
    // 10mm margin could let a full page of rows run underneath it.
    margin: { left: M, right: M, bottom: 24 },
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
    // A product row (with its thumbnail) must never be split across pages.
    rowPageBreak: 'avoid',
    // Repeat the column header on every page of a multi-page invoice.
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: TEXT,
      lineColor: HAIRLINE,
      lineWidth: 0.15,
      // Long names/details wrap inside their column instead of widening the
      // table past the A4 margin (the old auto sizing let unbroken text push
      // the right edge of the sheet).
      overflow: 'linebreak',
      cellPadding: { top: 3.2, bottom: 3.2, left: 1.5, right: 1.5 },
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5,
      textColor: CREAM,
      fillColor: INK,
      lineColor: GOLD,
      lineWidth: 0.5,
      cellPadding: { top: 3.6, bottom: 3.6, left: 1.5, right: 1.5 },
    },
    columnStyles: {
      // Fixed proportional widths — 30/28/10/16/16 of the 182mm content
      // width (100%), so the table always fills exactly between the A4
      // margins and money stays right-aligned and fully visible.
      0: { cellWidth: r1(CW * 0.3) },
      1: { cellWidth: r1(CW * 0.28) },
      2: { cellWidth: r1(CW * 0.1), halign: 'right' },
      3: { cellWidth: r1(CW * 0.16), halign: 'right' },
      4: { cellWidth: r1(CW * 0.16), halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head') return
      const item = inv.items[data.row.index]
      if (data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold'
        // Reserve room for the thumbnail frame on the left of the name.
        if (thumbs[data.row.index]) {
          data.cell.styles.cellPadding.left = 17
          // Force the row tall enough to fully contain the thumbnail frame
          // (minCellHeight is measured including padding). Without this the
          // frame is drawn centred over a shorter cell and overlaps the
          // neighbouring product rows in the downloaded PDF.
          data.cell.styles.minCellHeight = THUMB_FRAME + THUMB_CELL_PAD * 2
        }
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
      // Clamp the frame to the row height (rows are already forced to at
      // least THUMB_FRAME tall via minCellHeight) so an image can NEVER
      // overflow into an adjacent row, whatever the data.
      const size = Math.min(THUMB_FRAME, Math.max(3, data.cell.height - THUMB_CELL_PAD * 2))
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

  let ty = (doc.lastAutoTable?.finalY ?? tableStartY) + 9

  // ============================ PRICE SUMMARY ===============================
  const sumW = 78
  const sumX = W - M - sumW
  if (ty > H - 50) {
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
  ty += 12

  // =========================== THANK-YOU CARD ===============================
  if (ty > H - 52) {
    doc.addPage()
    ty = M
  }
  const thanksH = 30
  doc.setFillColor(...CREAM)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, ty, CW, thanksH, 3, 3, 'FD')
  doc.setFont('times', 'bold').setFontSize(13).setTextColor(...GOLD)
  doc.text('Thank You!', W / 2, ty + 9, { align: 'center' })
  doc.setFont('times', 'italic').setFontSize(10.5).setTextColor(...TEXT)
  doc.text(inv.company.thanks, W / 2, ty + 16, { align: 'center' })
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
  doc.text('We truly appreciate your trust in our attars.', W / 2, ty + 21.5, { align: 'center' })
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GOLD)
  doc.text(`— Team ${brandTitle}`, W / 2, ty + 26.5, { align: 'center' })

  // ============== PAGE FRAME + CORNER DETAILS + FOOTER (every page) ========
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)

    // Thin double gold page frame (outer + inner hairline)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.4)
    doc.roundedRect(M - 3, M - 3, CW + 6, H - (M - 3) * 2, 2, 2, 'S')
    doc.setDrawColor(...GOLD_LIGHT)
    doc.setLineWidth(0.18)
    doc.roundedRect(M - 1.5, M - 1.5, CW + 3, H - (M - 1.5) * 2, 1.5, 1.5, 'S')

    // Gold diamond accents at the four corners of the outer frame
    const fL = M - 3
    const fT = M - 3
    const fR = W - M + 3
    const fB = H - M + 3
    drawDiamond(doc, fL, fT, 1.6)
    drawDiamond(doc, fR, fT, 1.6)
    drawDiamond(doc, fL, fB, 1.6)
    drawDiamond(doc, fR, fB, 1.6)

    // Page footer — "Page i of n" flanked by gold rules with gold diamonds
    // (the ◆ accents of the reference design).
    const label = `Page ${i} of ${pages}`
    const py = H - 12
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED)
    const tw = doc.getTextWidth(label)
    const gap = 3.5
    const ruleLen = 16
    const lx = W / 2 - tw / 2 - gap - ruleLen
    const rx = W / 2 + tw / 2 + gap
    doc.setDrawColor(...GOLD).setLineWidth(0.3)
    doc.line(lx, py - 0.8, lx + ruleLen, py - 0.8)
    doc.line(rx, py - 0.8, rx + ruleLen, py - 0.8)
    drawDiamond(doc, lx, py - 0.8, 0.9)
    drawDiamond(doc, rx + ruleLen, py - 0.8, 0.9)
    doc.text(label, W / 2, py, { align: 'center' })
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
// Small inline contact icons for the print window (screen + print support
// icons; the jsPDF document keeps clean text because it has no icon assets).
const CONTACT_ICONS = {
  phone:
    '<svg class="cicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c1 .3 2 .5 3 .6a2 2 0 0 1 1.5 2z"/></svg>',
  email:
    '<svg class="cicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  website:
    '<svg class="cicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></svg>',
}

function renderPrintHtml(inv, logo) {
  const brandTitle = inv.company.brandTitle || inv.company.name
  const brandLines = invoiceBrandLines(brandTitle)
  const docTitle = inv.documentType || 'INVOICE'

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

  const contactBits = [
    inv.company.phone && { key: 'phone', icon: CONTACT_ICONS.phone, text: inv.company.phone },
    inv.company.email && { key: 'email', icon: CONTACT_ICONS.email, text: inv.company.email },
    inv.company.website && { key: 'website', icon: CONTACT_ICONS.website, text: inv.company.website },
  ].filter(Boolean)
  const legalBits = [inv.company.gstNote, `© ${inv.company.name}. All rights reserved.`].filter(Boolean)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)} ${escapeHtml(inv.orderId || '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1815; background: #fffdf8; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; }
  .frame { position: relative; margin: 6mm; padding: 12mm 12mm 10mm; border: 1px solid rgba(184,134,43,.55); outline: 1px solid rgba(184,134,43,.22); outline-offset: 3.5px; border-radius: 2px; }
  .corner { position: absolute; width: 7mm; height: 7mm; border: 0 solid #b8862b; }
  .corner.tl { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; border-top-left-radius: 2px; }
  .corner.tr { top: -1px; right: -1px; border-top-width: 2px; border-right-width: 2px; border-top-right-radius: 2px; }
  .corner.bl { bottom: -1px; left: -1px; border-bottom-width: 2px; border-left-width: 2px; border-bottom-left-radius: 2px; }
  .corner.br { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; border-bottom-right-radius: 2px; }
  .corner::after { content: ''; position: absolute; width: 4px; height: 4px; background: #b8862b; transform: rotate(45deg); border-radius: 1px; }
  .corner.tl::after { top: -5px; left: -5px; }
  .corner.tr::after { top: -5px; right: -5px; }
  .corner.bl::after { bottom: -5px; left: -5px; }
  .corner.br::after { bottom: -5px; right: -5px; }
  .head { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 14px; padding-bottom: 2.5mm; border-bottom: 1.2px solid #b8862b; }
  .head > div { min-width: 0; }
  .brand img { height: 11mm; width: auto; object-fit: contain; }
  .brand-center { text-align: center; min-width: 0; }
  .brand-center .company { display: block; font-family: Georgia, serif; font-weight: 700; color: #171512; text-align: center; overflow-wrap: anywhere; }
  .brand-center .company span { display: block; font-size: 30px; letter-spacing: .06em; line-height: 1.2; white-space: nowrap; overflow-wrap: anywhere; }
  .brand-center .tagline { display: block; font-size: 9.5px; letter-spacing: .28em; text-transform: uppercase; color: #b8862b; margin-top: 1.5mm; }
  .brand-center .divider { display: flex; align-items: center; justify-content: center; gap: 2mm; margin-top: 1.2mm; }
  .brand-center .divider .rule { width: 6mm; height: .3mm; background: linear-gradient(90deg, rgba(184,134,43,0), #b8862b); }
  .brand-center .divider .rule:last-child { background: linear-gradient(90deg, #b8862b, rgba(184,134,43,0)); }
  .brand-center .divider .diamond { width: 1.5mm; height: 1.5mm; background: #b8862b; transform: rotate(45deg); border-radius: .3mm; }
  .title { text-align: right; min-width: 0; }
  .title h2 { font-family: Georgia, serif; font-size: 21px; letter-spacing: .18em; color: #b8862b; font-weight: 700; }
  /* Long order ids wrap inside the right block instead of forcing the grid
     wider than the A4 sheet. */
  .title p { font-size: 8.5px; color: #6f6a63; margin-top: 1.2mm; margin-left: auto; max-width: 62mm; white-space: normal; overflow-wrap: anywhere; }
  .title p strong { color: #171512; }
  .contact { display: flex; justify-content: center; flex-wrap: wrap; gap: 1.5mm 7mm; padding: 2mm 0 0; font-size: 8px; color: #6f6a63; }
  .contact .citem { display: inline-flex; align-items: center; gap: 1.2mm; }
  .contact .cicon { width: 3.2mm; height: 3.2mm; color: #b8862b; flex-shrink: 0; }
  .contact .citem + .citem::before { content: ''; display: inline-block; width: 1.2mm; height: 1.2mm; background: #b8862b; border-radius: 50%; margin-right: 7mm; vertical-align: middle; }
  .legal { text-align: center; font-size: 7px; margin-top: 1mm; letter-spacing: .05em; }
  .legal p { margin: .5mm 0 0; color: #6f6a63; }
  .legal p:first-child { color: #8a5f1e; font-weight: 600; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; margin-top: 5.5mm; }
  .card { background: #f7f2e8; border: 1px solid rgba(184,134,43,.4); border-radius: 6px; padding: 4.5mm 5mm; }
  .card h3 { font-size: 7.5px; letter-spacing: .24em; text-transform: uppercase; color: #b8862b; margin-bottom: 3mm; padding-bottom: 2mm; border-bottom: 1px solid rgba(184,134,43,.25); }
  .card p { font-size: 9px; color: #1a1815; line-height: 1.5; }
  .card p.customer { font-size: 11px; font-weight: 700; color: #171512; }
  .card ul { list-style: none; }
  .card ul li { display: flex; justify-content: space-between; gap: 12px; font-size: 8.5px; color: #6f6a63; padding: 1.3mm 0; border-bottom: 1px solid rgba(184,134,43,.16); }
  .card ul li:last-child { border-bottom: none; }
  .card ul li strong { color: #171512; font-weight: 700; text-align: right; }
  table.items { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 7mm; }
  /* 30/30/10/15/15 column distribution — matches the PDF exactly, so the
     table can never widen past the sheet (long names wrap in-cell). */
  table.items col.c1 { width: 30%; }
  table.items col.c2 { width: 28%; }
  table.items col.c3 { width: 10%; }
  table.items col.c4 { width: 16%; }
  table.items col.c5 { width: 16%; }
  table.items th { background: #171512; color: #f7f2e8; text-align: left; font-size: 7.5px; letter-spacing: .14em; text-transform: uppercase; padding: 2.5mm 2.5mm; border-bottom: 1.5px solid #b8862b; overflow-wrap: anywhere; }
  table.items th.num, table.items td.num { text-align: right; }
  table.items td { padding: 2.5mm 2.5mm; font-size: 8.5px; border-bottom: 1px solid #ece7dc; vertical-align: top; overflow-wrap: anywhere; }
  table.items tbody tr:nth-child(even) { background: #fbf9f4; }
  table.items td.name { font-weight: 700; color: #171512; }
  table.items td.name .thumb-frame { display: inline-flex; align-items: center; justify-content: center; width: 12mm; height: 12mm; background: #f7f2e8; border: 1px solid #e6dcc6; border-radius: 1.5mm; overflow: hidden; margin-right: 2.5mm; vertical-align: middle; }
  table.items td.name img.thumb { width: 100%; height: 100%; object-fit: contain; border-radius: 1mm; }
  table.items td.detail { color: #6f6a63; }
  table.items td.detail .detail-main { display: block; }
  .summary { width: 78mm; min-width: 0; margin-left: auto; margin-top: 7mm; }
  .row { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 9px; color: #6f6a63; }
  .row span:last-child { color: #1a1815; }
  .row.grand { border-top: 1.2px solid #b8862b; margin-top: 1.5mm; padding-top: 2.5mm; font-size: 10.5px; font-weight: 700; color: #171512; }
  .row.grand .amount { color: #b8862b; font-size: 13px; }
  .thanks { margin-top: 7mm; padding: 5mm; background: #f7f2e8; border: 1px solid rgba(184,134,43,.45); border-radius: 8px; text-align: center; }
  .thanks .t { font-family: Georgia, serif; font-size: 15px; font-weight: 700; color: #b8862b; margin-bottom: 2mm; }
  .thanks .line { font-family: Georgia, serif; font-style: italic; font-size: 11px; color: #171512; }
  .thanks .sub { font-size: 8.5px; color: #6f6a63; margin-top: 1.2mm; }
  .thanks .sign { font-size: 8px; font-weight: 700; color: #b8862b; margin-top: 2mm; }
  .pagefoot .text { font-family: Georgia, serif; font-size: 9px; font-weight: 700; letter-spacing: .22em; color: #b8862b; white-space: nowrap; }
  .pagefoot { display: flex; align-items: center; justify-content: center; gap: 4mm; margin-top: 6mm; }
  .pagefoot .rule { flex: 0 1 32mm; height: 1px; background: linear-gradient(90deg, rgba(184,134,43,0), #b8862b); }
  .pagefoot .rule:last-child { background: linear-gradient(90deg, #b8862b, rgba(184,134,43,0)); }
  /* The frame's own margin (6mm) + padding (12mm) provide the ~18mm safe
     page margin, so @page must NOT add more — a 210mm sheet inside 12mm
     @page margins would measure 234mm and clip the gold frame's right edge
     in real print / Save-as-PDF. */
  @page { size: A4; margin: 0; }
  @media print { body { background: #fffdf8; } .frame { break-inside: auto; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="frame">
      <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>

      <div class="head">
        <div class="brand">${logo ? `<img src="${logo.dataUrl}" alt="" />` : ''}</div>
        <div class="brand-center">
          <span class="company">${brandLines.map((l) => `<span>${escapeHtml(l)}</span>`).join('')}</span>
          ${inv.company.tagline ? `<span class="tagline">${escapeHtml(inv.company.tagline)}</span>` : ''}
          <span class="divider"><span class="rule"></span><span class="diamond"></span><span class="rule"></span></span>
        </div>
        <div class="title">
          <h2>${escapeHtml(docTitle)}</h2>
          ${inv.orderId ? `<p># <strong>${escapeHtml(inv.orderId)}</strong></p>` : ''}
          ${inv.date ? `<p>Date : ${escapeHtml(inv.date)}</p>` : ''}
          ${inv.time ? `<p>Time : ${escapeHtml(inv.time)}</p>` : ''}
        </div>
      </div>

      ${contactBits.length > 0
        ? `<div class="contact">${contactBits
            .map((b) => `<span class="citem">${b.icon}<span>${escapeHtml(b.text)}</span></span>`)
            .join('')}</div>`
        : ''}
      ${legalBits.length > 0 ? `<div class="legal">${legalBits.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}</div>` : ''}

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
        <colgroup><col class="c1" /><col class="c2" /><col class="c3" /><col class="c4" /><col class="c5" /></colgroup>
        <thead>
          <tr><th>Product</th><th>Details</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5">No items recorded for this order.</td></tr>'}
        </tbody>
      </table>

      <div class="summary">
        <div class="row"><span>Subtotal</span><span>${formatINR(inv.subtotal)}</span></div>
        <div class="row"><span>Delivery / Transport</span><span>${inv.delivery == null ? 'To be confirmed' : formatINR(inv.delivery)}</span></div>
        <div class="row grand"><span>Total</span><span class="amount">${formatINR(inv.total)}</span></div>
      </div>

      <div class="thanks">
        <p class="t">Thank You!</p>
        <p class="line">${escapeHtml(inv.company.thanks)}</p>
        <p class="sub">We truly appreciate your trust in our attars.</p>
        <p class="sign">— Team ${escapeHtml(brandTitle)}</p>
      </div>

      <div class="pagefoot">
        <span class="rule"></span>
        <span class="text">◆ Page 1 of 1 ◆</span>
        <span class="rule"></span>
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
