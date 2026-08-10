// ============================================================================
// <OrderInvoice order={order} /> — the ONE reusable invoice sheet.
// Rendered from the SAVED ORDER RECORD via utils/invoice.js (never the cart,
// never live product prices). Used on the success page, the View Order page,
// tracking results and Admin Orders — identical document everywhere.
//
// The on-screen sheet is a responsive A4 preview; the dedicated print window
// and the jsPDF download share the same data formatter, so the three surfaces
// always agree.
//
// DESIGN: premium luxury attar invoice — cream/white sheet, hairline gold
// page frame with corner accents, serif brand + gold INVOICE title, BILL TO /
// ORDER INFORMATION cards, dark product table, right-aligned totals, status
// pill, trust row, thank-you card and dark footer. Every value comes from
// formatOrderForInvoice(order); nothing is hardcoded and nothing is invented.
// ============================================================================

import { IMAGES } from '../../config/assets'
import { formatOrderForInvoice, formatINR } from '../../utils/invoice'
import './OrderInvoice.css'

// --- Small stroke icons (inline so the admin copy stays self-contained) -----
const icons = {
  phone: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.27a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9Z" />
    </svg>
  ),
  mail: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  gem: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12l4 6-10 12L2 9l4-6Z" />
      <path d="M2 9h20M12 21 8 9l4-6 4 6-4 12" />
    </svg>
  ),
  shield: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="m9 11.5 2 2 4-4.5" />
    </svg>
  ),
  headset: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 18 0" />
      <path d="M3 13.5v3a2.5 2.5 0 0 0 2.5 2.5H7v-8H5.5A2.5 2.5 0 0 0 3 13.5Z" />
      <path d="M21 13.5v3a2.5 2.5 0 0 1-2.5 2.5H17v-8h1.5a2.5 2.5 0 0 1 2.5 2.5Z" />
      <path d="M17 19a3 3 0 0 1-3 3h-2" />
    </svg>
  ),
  payment: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </svg>
  ),
}

// Trust row copy — descriptive lines only (no invented business claims).
// Each item carries its own line-icon key so the four promises render with
// distinct icons (gem / check / shield / headset).
const TRUST_ITEMS = [
  { key: 'original', icon: 'gem', title: '100% Original', sub: 'Authentic attars from trusted sources' },
  { key: 'quality', icon: 'check', title: 'Premium Quality', sub: 'Finest ingredients & long lasting' },
  { key: 'packaging', icon: 'shield', title: 'Secure Packaging', sub: 'Carefully packed for safe delivery' },
  { key: 'support', icon: 'headset', title: 'Customer Support', sub: "We're here to help you always" },
]

export default function OrderInvoice({ order }) {
  const inv = formatOrderForInvoice(order)

  const contactBits = [inv.company.phone, inv.company.email].filter(Boolean)
  const infoRows = [
    inv.orderId && ['Order ID', inv.orderId],
    inv.date && ['Date', inv.date],
    inv.time && ['Time', inv.time],
    inv.paymentMethod && ['Payment', inv.paymentMethod],
    inv.status && ['Status', inv.status],
  ].filter(Boolean)

  // Normalized status for the pill colour — always derived from the REAL
  // status text; unknown statuses fall back to the neutral gold pill.
  const statusClass =
    String(inv.status || 'Pending').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'pending'

  return (
    <div className="invoice-sheet" aria-label={`Invoice ${inv.orderId}`}>
      {/* Hairline gold page frame + corner accents */}
      <div className="invoice-frame">
        <span className="invoice-corner invoice-corner--tl" aria-hidden="true" />
        <span className="invoice-corner invoice-corner--tr" aria-hidden="true" />
        <span className="invoice-corner invoice-corner--bl" aria-hidden="true" />
        <span className="invoice-corner invoice-corner--br" aria-hidden="true" />

        {/* Header — logo (left) · brand (centre) · INVOICE + reference (right) */}
        <header className="invoice-head">
          <div className="invoice-brand">
            <img src={IMAGES.logo} alt="" className="invoice-logo" />
          </div>
          <div className="invoice-brand-center">
            <span className="invoice-company">{inv.company.name}</span>
            {inv.company.tagline && (
              <span className="invoice-tagline">{inv.company.tagline}</span>
            )}
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

        {/* Contact bar — thin gold divider + real contact values only */}
        {contactBits.length > 0 && (
          <div className="invoice-contact">
            <span className="invoice-contact-item">
              <span className="invoice-contact-icon" aria-hidden="true">{icons.phone}</span>
              {contactBits[0]}
            </span>
            {contactBits[1] && (
              <span className="invoice-contact-item">
                <span className="invoice-contact-icon" aria-hidden="true">{icons.mail}</span>
                {contactBits[1]}
              </span>
            )}
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

        {/* Totals (right) + payment / status */}
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

          {/* Payment method + real order status */}
          <section className="invoice-pay-status" aria-label="Payment and status">
            <div className="invoice-pay-block">
              <span className="invoice-pay-icon" aria-hidden="true">{icons.payment}</span>
              <div>
                <p className="invoice-pay-label">Payment Method</p>
                <p className="invoice-pay-value">{inv.paymentMethod}</p>
              </div>
            </div>
            <div className="invoice-pay-block">
              <span className="invoice-pay-icon" aria-hidden="true">{icons.check}</span>
              <div>
                <p className="invoice-pay-label">Order Status</p>
                <p className={`invoice-status-pill invoice-status-pill--${statusClass}`}>
                  {inv.status}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Trust row — compact premium reassurance */}
        <section className="invoice-trust" aria-label="Why shop with us">
          {TRUST_ITEMS.map((t) => (
            <div className="invoice-trust-item" key={t.key}>
              <span className="invoice-trust-icon" aria-hidden="true">
                {icons[t.icon] || icons.check}
              </span>
              <div>
                <strong>{t.title}</strong>
                <span>{t.sub}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Thank-you card */}
        <section className="invoice-thanks-card" aria-label="Thank you">
          <p className="invoice-thanks-title">Thank You!</p>
          <p className="invoice-thanks-line">{inv.company.thanks}</p>
          <p className="invoice-thanks-sub">We truly appreciate your trust in our attars.</p>
          <p className="invoice-thanks-sign">— Team {inv.company.name}</p>
        </section>

        {/* Dark footer with the real GST note + copyright */}
        <footer className="invoice-foot">
          <p className="invoice-foot-line">{inv.company.gstNote}</p>
          <p className="invoice-foot-line">
            © {inv.company.name}. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  )
}
