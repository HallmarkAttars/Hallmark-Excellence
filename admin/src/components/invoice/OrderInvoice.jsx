// ============================================================================
// <OrderInvoice order={order} /> — the ONE reusable invoice sheet (admin copy,
// identical to the storefront component). Rendered from the SAVED ORDER
// RECORD via utils/invoice.js (never the cart, never live product prices).
// ============================================================================

import { formatOrderForInvoice, formatINR } from '../../utils/invoice'
import { INVOICE_LOGO } from './invoiceAssets'
import './OrderInvoice.css'

export default function OrderInvoice({ order }) {
  const inv = formatOrderForInvoice(order)

  return (
    <div className="invoice-sheet" aria-label={`Invoice ${inv.orderId}`}>
      {/* Header — logo + company on the left, INVOICE title on the right */}
      <header className="invoice-head">
        <div className="invoice-brand">
          <img src={INVOICE_LOGO} alt="" className="invoice-logo" />
          <span className="invoice-company">{inv.company.name}</span>
        </div>
        <div className="invoice-title-block">
          <h2 className="invoice-title">Invoice</h2>
          <p className="invoice-sub">Order Receipt</p>
        </div>
      </header>

      {/* Invoice reference + order date/time — stable, from the saved order */}
      <section className="invoice-meta" aria-label="Invoice reference">
        {inv.orderId && (
          <p className="invoice-meta-row">
            <span>Invoice Ref</span>
            <strong>{inv.orderId}</strong>
          </p>
        )}
        {inv.date && (
          <p className="invoice-meta-row">
            <span>Order Date</span>
            <strong>{inv.date}</strong>
          </p>
        )}
        {inv.time && (
          <p className="invoice-meta-row">
            <span>Order Time</span>
            <strong>{inv.time}</strong>
          </p>
        )}
      </section>

      {/* BILL TO — only fields actually stored; no undefined/null clutter */}
      <section className="invoice-billto" aria-label="Bill to">
        <h3 className="invoice-section-label">Bill To</h3>
        {inv.customer.name && <p className="invoice-customer-name">{inv.customer.name}</p>}
        {inv.customer.phone && <p>{inv.customer.phone}</p>}
        {inv.customer.email && <p>{inv.customer.email}</p>}
        {inv.addressLines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </section>

      {/* Items table — grows vertically for multiple products */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Details</th>
            <th className="invoice-num">Qty</th>
            <th className="invoice-num">Rate</th>
            <th className="invoice-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={`${it.name}-${i}`}>
              <td className="invoice-item-name">{it.name}</td>
              <td className="invoice-item-detail">{it.detail || ''}</td>
              <td className="invoice-num">{it.qty}</td>
              <td className="invoice-num">{formatINR(it.rate)}</td>
              <td className="invoice-num">{formatINR(it.amount)}</td>
            </tr>
          ))}
          {inv.items.length === 0 && (
            <tr>
              <td colSpan={5} className="invoice-empty">No items recorded for this order.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals — subtotal, delivery (stored figure or "To be confirmed"), total */}
      <section className="invoice-totals" aria-label="Totals">
        <div className="invoice-total-row">
          <span>Subtotal</span>
          <span>{formatINR(inv.subtotal)}</span>
        </div>
        <div className="invoice-total-row">
          <span>Delivery / Transport</span>
          <span>{inv.delivery == null ? 'To be confirmed' : formatINR(inv.delivery)}</span>
        </div>
        <div className="invoice-total-row invoice-grand-total">
          <span>Total</span>
          <span>{formatINR(inv.total)}</span>
        </div>
      </section>

      {/* Payment method + current status (status never alters the figures) */}
      <section className="invoice-pay-status" aria-label="Payment and status">
        <p className="invoice-pay-status-row">
          <span>Payment Method</span>
          <strong>{inv.paymentMethod}</strong>
        </p>
        <p className="invoice-pay-status-row">
          <span>Order Status</span>
          <strong>{inv.status}</strong>
        </p>
      </section>

      {/* Footer — GST note (no invented tax breakdown), thanks, company */}
      <footer className="invoice-foot">
        <p className="invoice-gst">{inv.company.gstNote}</p>
        <p className="invoice-thanks">{inv.company.thanks}</p>
        <div className="invoice-company-foot">
          <strong>{inv.company.name}</strong>
          {inv.company.phone && <span>{inv.company.phone}</span>}
          {inv.company.email && <span>{inv.company.email}</span>}
        </div>
      </footer>
    </div>
  )
}
