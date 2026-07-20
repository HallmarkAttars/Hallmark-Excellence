import { Fragment, useEffect, useState } from 'react'
import { getOrders, updateOrderStatus } from '../services/mockApi'
import './Orders.css'

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getOrders().then((o) => {
      setOrders([...o].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      setLoading(false)
    })
  }, [])

  const handleStatusChange = async (id, status) => {
    const updated = await updateOrderStatus(id, status)
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
  }

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders yet.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th></th><th>Order #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <Fragment key={o.id}>
                    <tr className="orders-row" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                      <td className="orders-expand-icon">{expanded === o.id ? '−' : '+'}</td>
                      <td>{o.order_number}</td>
                      <td>{o.customer_name}</td>
                      <td>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                      <td>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className="orders-status-select"
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                    {expanded === o.id && (
                      <tr className="orders-detail-row">
                        <td colSpan={6}>
                          <div className="orders-detail">
                            <div>
                              <h4>Customer</h4>
                              <p>{o.customer_name}</p>
                              <p>{o.phone}</p>
                              <p>{o.address}, {o.pincode}</p>
                              {o.message && <p>"{o.message}"</p>}
                            </div>
                            <div>
                              <h4>Items</h4>
                              {o.items.map((item, i) => (
                                <p key={i}>{item.name} × {item.qty} — ₹{Number(item.price * item.qty).toLocaleString('en-IN')}</p>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
