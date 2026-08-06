import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/ui/StatCard'
import { getDashboardStats } from '../services/mockApi'
import './Dashboard.css'

const ICONS = {
  products: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 7 12 3 4 7v10l8 4 8-4V7Z" /><path d="M4 7l8 4 8-4M12 11v10" /></svg>,
  orders: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="7" width="16" height="14" rx="2" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></svg>,
  customers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="18" cy="9" r="2.5" /><path d="M15.5 14.5A5.5 5.5 0 0 1 21.5 20" /></svg>,
  revenue: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 6H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6" /></svg>,
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats().then((s) => {
      setStats(s)
      setRecentOrders(s.recentOrders ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="loading-state">Loading dashboard…</div>

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Products" value={stats.totalProducts} icon={ICONS.products} />
        <StatCard label="Orders" value={stats.totalOrders} icon={ICONS.orders} />
        <StatCard label="Customers" value={stats.totalCustomers} icon={ICONS.customers} />
        <StatCard label="Revenue" value={`₹${Number(stats.revenue).toLocaleString('en-IN')}`} icon={ICONS.revenue} />
      </div>

      <div className="dashboard-grid">
        <div className="card recent-orders">
          <div className="page-header">
            <h3>Recent Orders</h3>
            <Link to="/admin/orders" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {/* Desktop table — shown at >= 768px */}
          <div className="table-scroll recent-orders-table">
            <table>
              <thead>
                <tr><th>Order #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{o.customer_name}</td>
                    <td>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                    <td><span className={`status-pill status-${String(o.status).toLowerCase()}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile order cards — same recentOrders array, shown only below 768px.
              No additional data fetching; the desktop table above is hidden on mobile. */}
          <div className="recent-orders-cards">
            {recentOrders.map((o) => (
              <div className="recent-order-card" key={o.id}>
                <div className="recent-order-top">
                  <span className="recent-order-id" title={o.order_number}>{o.order_number}</span>
                  <span className={`status-pill status-${String(o.status).toLowerCase()}`}>{o.status}</span>
                </div>
                <span className="recent-order-customer">{o.customer_name}</span>
                <div className="recent-order-bottom">
                  <span className="recent-order-date">
                    {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="recent-order-amount">₹{Number(o.total_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card quick-actions">
          <h3>Quick Actions</h3>
          <div className="quick-actions-buttons">
            <Link to="/admin/products/new" className="btn btn-dark">Add New Product</Link>
            <button className="btn btn-outline">Create Coupon</button>
            <button className="btn btn-outline">Export Orders</button>
          </div>
        </div>
      </div>
    </div>
  )
}
