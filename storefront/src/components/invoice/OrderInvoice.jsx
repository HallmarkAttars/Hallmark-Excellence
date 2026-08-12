// ============================================================================
// <OrderInvoice order={order} documentType?="INVOICE|ESTIMATE" /> — the ONE
// reusable invoice sheet. Rendered from the SAVED ORDER RECORD via
// utils/invoice.js (never the cart, never live product prices). Used on the
// success page, the View Order page, tracking results and Admin Orders —
// identical document everywhere.
//
// The on-screen sheet is a responsive A4 preview; the dedicated print window
// and the jsPDF download share the same data formatter, so the three surfaces
// always agree.
//
// DESIGN: premium luxury attar invoice — warm off-white sheet, thin double
// gold page border with gold corner accents, two-line serif brand + tagline,
// dynamic INVOICE / ESTIMATE title with #order / date / time, BILL TO +
// ORDER INFORMATION cards, dark product table, right-aligned totals, gold
// thank-you card and a "Page 1 of 1" footer. Every value comes from
// formatOrderForInvoice(order); nothing is hardcoded and nothing is invented.
// ============================================================================

import { formatOrderForInvoice, formatINR, invoiceBrandLines } from '../../utils/invoice'
import { INVOICE_LOGO } from './invoiceAssets'
import './OrderInvoice.css'

export default function OrderInvoice({ order, documentType }) {
  const inv = formatOrderForInvoice(order)

  // Document type — INVOICE by default; an explicit prop or a stored
  // document_type flag on the order record switches to ESTIMATE. Both paths
  // normalise onto INVOICE/ESTIMATE (a 'quotation' flag prints ESTIMATE).
  const rawDocType = String(documentType || inv.documentType || 'INVOICE').toUpperCase()
  const docTitle = rawDocType === 'ESTIMATE' || rawDocType === 'QUOTATION' ? 'ESTIMATE' : 'INVOICE'

  // Brand rendered as two stacked centred lines (HALLMARK OF / EXCELLENCE).
  const brandLines = invoiceBrandLines(inv.company.name)

  // Contact strip — real configured values only (phone · email · website).
  const contactBits = [inv.company.phone, inv.company.email, inv.company.website].filter(Boolean)
  // Legal lines under the header — the real GST note + copyright.
  const legalBits = [inv.company.gstNote, `© ${inv.company.name}. All rights reserved.`].filter(Boolean)

  const infoRows = [
    inv.orderId && ['Order ID', inv.orderId],
    inv.date && ['Date', inv.date],
    inv.time && ['Time', inv.time],
    inv.paymentMethod && ['Payment', inv.paymentMethod],
    inv.status && ['Status', inv.status],
  ].filter(Boolean)

  return (
    <div className="invoice-sheet" aria-label={`${docTitle} ${inv.orderId}`}>
      {/* Thin double gold page border + corner accents */}
      <div className="invoice-frame">
        <span className="invoice-corner invoice-corner--tl" aria-hidden="true" />
        <span className="invoice-corner invoice-corner--tr" aria-hidden="true" />
        <span className="invoice-corner invoice-corner--bl" aria-hidden="true" />
        <span className="invoice-corner invoice-corner--br" aria-hidden="true" />

        {/* Header — logo (left) · two-line brand (centre) · INVOICE/ESTIMATE (right) */}
        <header className="invoice-head">
          <div className="invoice-brand">
            <img src={INVOICE_LOGO} alt="" className="invoice-logo" />
          </div>
          <div className="invoice-brand-center">
            <span className="invoice-company">
              {brandLines.map((line, i) => (
                <span className="invoice-company-line" key={i}>{line}</span>
              ))}
            </span>
            {inv.company.tagline && (
              <span className="invoice-tagline">{inv.company.tagline}</span>
            )}
          </div>
          <div className="invoice-title-block">
            <h2 className="invoice-title">{docTitle}</h2>
            {inv.orderId && (
              <p className="invoice-meta-line">#<strong>{inv.orderId}</strong></p>
            )}
            {inv.date && <p className="invoice-meta-line">Date : {inv.date}</p>}
            {inv.time && <p className="invoice-meta-line">Time : {inv.time}</p>}
          </div>
        </header>

        {/* Contact strip — thin gold divider above; phone · email · website */}
        {contactBits.length > 0 && (
          <div className="invoice-contact">
            {contactBits.map((bit, i) => (
              <span className="invoice-contact-item" key={i}>{bit}</span>
            ))}
          </div>
        )}
        {legalBits.length > 0 && (
          <div className="invoice-legal">
            {legalBits.map((line, i) => <p key={i}>{line}</p>)}
          </div>
        )}

        {/* BILL TO + ORDER INFORMATION — two side-by-side cards */}
        <section className="invoice-cards" aria-label="Order details">
          <div className="invoice-card">
            <h3 className="invoice-card-title">Bill To</h3>
            {inv.customer.name && <p className="invoice-customer-name">{inv.customer.name}</p>}
            {inv.customer.phone && <p>{inv.customer.phone}</p>}
            {inv.customer.email && <p>{inv.customer.email}</p>}
            {inv.addressLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <div className="invoice-card">
            <h3 className="invoice-card-title">Order Information</h3>
            {infoRows.map(([label, value]) => (
              <p className="invoice-info-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </p>
            ))}
          </div>
        </section>

        {/* Items table — grows vertically for multiple products */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Details</th>
              <th className="invoice-num">Qty</th>
              <th className="invoice-num">Rate</th>
              <th className="invoice-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={`${it.name}-${i}`}>
                <td className="invoice-item-name">
                  {it.image && (
                    <span className="invoice-thumb-frame">
                      <img
                        className="invoice-thumb"
                        src={it.image}
                        alt=""
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </span>
                  )}
                  <span className="invoice-item-name-text">{it.name}</span>
                </td>
                <td className="invoice-item-detail">
                  {it.detail && <span className="invoice-item-detail-main">{it.detail}</span>}
                  {it.pack && (
                    <span className="invoice-pack-tag">
                      {it.pack.name}
                      {it.pack.packs != null && ` · ${it.pack.packs} pack${it.pack.packs === 1 ? '' : 's'} · ${it.pack.pieces} pieces`}
                      {it.pack.price != null && ` · ${formatINR(it.pack.price)} / pack`}
                    </span>
                  )}
                </td>
                <td className="invoice-num">{it.pack ? (it.pack.pieces ?? it.qty) : it.qty}</td>
                <td className="invoice-num">{formatINR(it.rate)}</td>
                <td className="invoice-num invoice-amount">{formatINR(it.amount)}</td>
              </tr>
            ))}
            {inv.items.length === 0 && (
              <tr>
                <td colSpan={5} className="invoice-empty">No items recorded for this order.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals — right-aligned pricing summary */}
        <div className="invoice-lower">
          <section className="invoice-summary" aria-label="Totals">
            <div className="invoice-summary-row">
              <span>Subtotal</span>
              <span>{formatINR(inv.subtotal)}</span>
            </div>
            <div className="invoice-summary-row">
              <span>Delivery / Transport</span>
              <span>{inv.delivery == null ? 'To be confirmed' : formatINR(inv.delivery)}</span>
            </div>
            <div className="invoice-summary-row invoice-grand-total">
              <span>Total</span>
              <span className="invoice-grand-amount">{formatINR(inv.total)}</span>
            </div>
          </section>
        </div>

        {/* Thank-you card */}
        <section className="invoice-thanks-card" aria-label="Thank you">
          <p className="invoice-thanks-title">Thank You!</p>
          <p className="invoice-thanks-line">{inv.company.thanks}</p>
          <p className="invoice-thanks-sub">We truly appreciate your trust in our attars.</p>
          <p className="invoice-thanks-sign">— Team {inv.company.name}</p>
        </section>

        {/* Page footer — Page 1 of 1 with gold decorative separators */}
        <footer className="invoice-pagefoot" aria-hidden="true">
          <span className="invoice-pagefoot-rule" />
          <span className="invoice-pagefoot-text">✦ Page 1 of 1 ✦</span>
          <span className="invoice-pagefoot-rule" />
        </footer>
      </div>
    </div>
  )
}
