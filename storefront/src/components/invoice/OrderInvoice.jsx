// ============================================================================
// <OrderInvoice order={order} /> — the ONE reusable invoice sheet.
// Rendered from the SAVED ORDER RECORD via utils/invoice.js (never the cart,
// never live product prices). Used on the success page, the View Order page,
// tracking results and Admin Orders — identical document everywhere.
//
// The on-screen sheet is a responsive A4 preview; the dedicated print window
// and the jsPDF download share the same data formatter, so the three surfaces
// always agree.
// ============================================================================

import { IMAGES } from '../../config/assets'
import { formatOrderForInvoice, formatINR } from '../../utils/invoice'
import './OrderInvoice.css'

export default function OrderInvoice({ order }) {
  const inv = formatOrderForInvoice(order)

  const contactBits = [inv.company.phone, inv.company.email].filter(Boolean).join('  ·  ')
  const infoRows = [
    inv.orderId && ['Order ID', inv.orderId],
    inv.date && ['Date', inv.date],
    inv.time && ['Time', inv.time],
    inv.paymentMethod && ['Payment', inv.paymentMethod],
  ].filter(Boolean)

  return (
    <div className="invoice-sheet" aria-label={`Invoice ${inv.orderId}`}>
      {/* Header — logo + brand (left) · INVOICE + reference (right) */}
      <header className="invoice-head">
        <div className="invoice-brand">
          <img src={IMAGES.logo} alt="" className="invoice-logo" />
          <div className="invoice-brand-text">
            <span className="invoice-company">{inv.company.name}</span>
            {inv.company.tagline && (
              <span className="invoice-tagline">{inv.company.tagline}</span>
            )}
          </div>
        </div>
        <div className="invoice-title-block">
          <h2 className="invoice-title">Invoice</h2>
          {inv.orderId && (
            <p className="invoice-meta-line">
              Invoice # <strong>{inv.orderId}</strong>
            </p>
          )}
          {inv.date && <p className="invoice-meta-line">Date: {inv.date}</p>}
          {inv.time && <p className="invoice-meta-line">Time: {inv.time}</p>}
        </div>
      </header>

      {/* Business contact strip — real config values only */}
      {contactBits && <p className="invoice-contact">{contactBits}</p>}

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
                  <img
                    className="invoice-thumb"
                    src={it.image}
                    alt=""
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                <span className="invoice-item-name-text">{it.name}</span>
              </td>
              <td className="invoice-item-detail">
                {it.detail && <span className="invoice-item-detail-main">{it.detail}</span>}
                {it.bulkApplied && (
                  <span className="invoice-bulk-tag">
                    Bulk Price Applied{it.bulkPrice != null && ` · ${formatINR(it.bulkPrice)} / piece`}
                  </span>
                )}
              </td>
              <td className="invoice-num">{it.qty}</td>
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

      {/* Bulk pricing band — only when the saved order applied bulk pricing */}
      {inv.hasBulkPricing && (
        <div className="invoice-bulk-band" role="note">
          <strong>Bulk Pricing Applied</strong>
          <span>
            Special quantity pricing has been applied to this order based on the
            applicable bulk tier.
          </span>
        </div>
      )}

      {/* Price summary — subtotal, delivery (stored or "To be confirmed"), total */}
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

      {/* Payment method + current status (status never alters the figures) */}
      <section className="invoice-pay-status" aria-label="Payment and status">
        <div className="invoice-pay-block">
          <p className="invoice-pay-label">Payment Method</p>
          <p className="invoice-pay-value">{inv.paymentMethod}</p>
        </div>
        <div className="invoice-pay-block">
          <p className="invoice-pay-label">Order Status</p>
          <p className="invoice-pay-value">{inv.status}</p>
        </div>
      </section>

      {/* Footer — thanks, tagline, contact, GST note */}
      <footer className="invoice-foot">
        <p className="invoice-thanks">{inv.company.thanks}</p>
        {inv.company.tagline && <p className="invoice-tagline">{inv.company.tagline}</p>}
        {contactBits && <p className="invoice-foot-line">{contactBits}</p>}
        {inv.company.address && <p className="invoice-foot-line">{inv.company.address}</p>}
        <p className="invoice-gst">{inv.company.gstNote}</p>
        <p className="invoice-generated">This is a computer-generated invoice.</p>
      </footer>
    </div>
  )
}
