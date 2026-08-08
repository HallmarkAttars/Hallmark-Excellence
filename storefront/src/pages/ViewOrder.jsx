// ============================================================================
// View Order — the customer's saved order with the invoice available.
//
// SECURITY: the full order is only ever handed over via router state from the
// success page (the checkout POST response) or the tracking flow (the
// resolved order). There is no /view-order?orderId= URL parameter and no
// arbitrary order fetch, so changing an ID can never open someone else's
// invoice. A direct visit without state is redirected to Track Order, the
// secure lookup flow.
// ============================================================================

import { Link, Navigate, useLocation } from 'react-router-dom'
import OrderInvoice from '../components/invoice/OrderInvoice'
import { InvoiceDownloadButton, InvoicePrintButton } from '../components/invoice/InvoiceActions'
import './ViewOrder.css'

export default function ViewOrder() {
  const location = useLocation()
  const order = location.state?.order

  if (!order) {
    return <Navigate to="/track-order" replace />
  }

  const orderId = order.orderId || order.order_number || order.orderNumber || ''
  const status = order.status || order.order_status || 'Pending'

  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">Order</p>
        <h1>Order #{orderId}</h1>
        <p>Your order details and invoice — download or print a copy any time.</p>
      </div>

      <div className="view-order-wrap">
        <div className="view-order-head">
          <span className={`track-status-pill track-status-${String(status).toLowerCase()}`}>
            {status}
          </span>
        </div>

        <div className="view-order-actions">
          <Link to="/track-order" state={{ orderNumber: orderId }} className="btn btn-gold">
            Track Order
          </Link>
          <InvoiceDownloadButton order={order} className="btn btn-primary" />
          <InvoicePrintButton order={order} className="btn btn-outline" />
          <Link to="/shop" className="btn btn-outline view-order-continue">Continue Shopping</Link>
        </div>

        <OrderInvoice order={order} />
      </div>
    </div>
  )
}
