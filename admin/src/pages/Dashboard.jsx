import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/ui/StatCard'
import AdminStatusBadge from '../components/ui/AdminStatusBadge'
import RevenueChart from '../components/dashboard/RevenueChart'
import { getOrders, getProducts } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import { formatINR, formatOrderDate, formatOrderTime, formatItemsCount } from '../utils/format'
import {
  PERIOD_OPTIONS,
  statusCounts,
  revenueTotal,
  ordersToday,
  productsThisMonth,
  monthOverMonth,
  revenueBuckets,
  topProducts,
  pendingPaymentOrders,
} from '../utils/dashboard'
import './Dashboard.css'

// The existing app is REST-based (no websockets), so the dashboard refreshes
// on a gentle interval + tab focus — the same pattern as the notification
// bell. Data comes from the EXISTING getOrders()/getProducts() services.
const REFRESH_MS = 60000
const RECENT_LIMIT = 6

const ICONS = {
  products: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 7 12 3 4 7v10l8 4 8-4V7Z" /><path d="M4 7l8 4 8-4M12 11v10" />
    </svg>
  ),
  orders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="7" width="16" height="14" rx="2" /><path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  pending: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  revenue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2v20M17 6H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6" />
    </svg>
  ),
}

// Real order statuses — the same values the backend writes. Mapped directly,
// never renamed.
const STATUS_META = [
  {
    key: 'Pending',
    tone: 'pending',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    key: 'Processing',
    tone: 'processing',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2v4m0 12v4M2 12h4m12 0h4" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    key: 'Shipped',
    tone: 'shipped',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'Delivered',
    tone: 'delivered',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" />
      </svg>
    ),
  },
  {
    key: 'Cancelled',
    tone: 'cancelled',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
  },
]

// ---------------------------------------------------------------- skeletons
function SkeletonBar({ width }) {
  return <span className="dash-sk dash-sk--bar" style={{ width }} aria-hidden="true" />
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-page" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-header">
        <div>
          <SkeletonBar width="160px" />
          <SkeletonBar width="240px" />
        </div>
      </div>
      <div className="dash-kpis">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat-card stat-card--skeleton" key={i}>
            <div>
              <SkeletonBar width="90px" />
              <SkeletonBar width="70px" />
              <SkeletonBar width="120px" />
            </div>
          </div>
        ))}
      </div>
      <div className="dash-skeleton-grid">
        <div className="card dash-section"><SkeletonBar width="180px" /><div className="dash-sk-lines"><SkeletonBar width="100%" /><SkeletonBar width="100%" /></div></div>
        <div className="card dash-section"><SkeletonBar width="160px" /><div className="dash-sk-lines"><SkeletonBar width="100%" /><SkeletonBar width="100%" /></div></div>
      </div>
      <div className="dash-skeleton-grid">
        <div className="card dash-section"><SkeletonBar width="140px" /><div className="dash-sk-lines"><SkeletonBar width="100%" /><SkeletonBar width="100%" /></div></div>
        <div className="card dash-section"><SkeletonBar width="180px" /><div className="dash-sk-lines"><SkeletonBar width="100%" /><SkeletonBar width="100%" /></div></div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- dashboard
export default function Dashboard() {
  const { can } = useAuth()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('7d')
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([getOrders(), getProducts()])
      if (!mountedRef.current) return
      setOrders(o)
      setProducts(p)
      setError(null)
    } catch (err) {
      console.error('[dashboard] load failed:', err)
      if (mountedRef.current) setError(err?.message || 'Unable to load dashboard data.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // One refresh loop (interval + focus), cleaned up on unmount — no duplicate
  // listeners, no leaks.
  useEffect(() => {
    mountedRef.current = true
    load()
    const onFocus = () => load()
    const timer = window.setInterval(load, REFRESH_MS)
    window.addEventListener('focus', onFocus)
    return () => {
      mountedRef.current = false
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [load])

  const retry = () => {
    setLoading(true)
    setError(null)
    load()
  }

  // ------------------------------------------------------- derived (REAL data)
  const counts = useMemo(() => statusCounts(orders), [orders])
  const totalOrders = orders.length
  const pendingCount = counts.Pending
  const totalRevenue = useMemo(() => revenueTotal(orders), [orders])
  const todayCount = useMemo(() => ordersToday(orders), [orders])
  const productsMonth = useMemo(() => productsThisMonth(products), [products])
  const mom = useMemo(() => monthOverMonth(orders), [orders])
  const chartPoints = useMemo(() => revenueBuckets(orders, period), [orders, period])
  const periodTotal = useMemo(() => chartPoints.reduce((sum, b) => sum + b.value, 0), [chartPoints])
  const top = useMemo(() => topProducts(orders, 5), [orders])
  const pendingPayments = useMemo(() => pendingPaymentOrders(orders), [orders])
  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, RECENT_LIMIT),
    [orders]
  )

  const revenueSub = mom
    ? mom.pct == null
      ? 'New revenue this month'
      : Math.abs(mom.pct) >= 1000
        ? `${mom.pct >= 0 ? '↑' : '↓'} vs last month`
        : `${mom.pct >= 0 ? '↑' : '↓'} ${Math.abs(mom.pct).toFixed(1)}% vs last month`
    : ''
  const revenueTone = mom && mom.pct != null ? (mom.pct >= 0 ? 'up' : 'down') : 'neutral'

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="page-header"><h1>Dashboard</h1></div>
        <div className="card dash-error">
          <span className="dash-error-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" />
            </svg>
          </span>
          <h3>Unable to load dashboard data</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-dark" onClick={retry}>Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header dash-page-header">
        <div className="dash-page-title">
          <h1>Dashboard</h1>
          <p className="page-subtitle">Overview of your store performance</p>
        </div>
        <div className="dash-quick-actions">
          {can('products.create') && (
            <Link to="/admin/products/new" className="btn btn-dark">+ Add New Product</Link>
          )}
          <Link to="/admin/orders" className="btn btn-outline">View Orders</Link>
          <Link to="/admin/products" className="btn btn-outline">Products</Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="dash-kpis">
        <StatCard
          label="Total Products"
          value={products.length}
          icon={ICONS.products}
          sub={`${productsMonth} added this month`}
        />
        <StatCard
          label="Total Orders"
          value={totalOrders}
          icon={ICONS.orders}
          sub={`${todayCount} today`}
        />
        <StatCard
          label="Pending Orders"
          value={pendingCount}
          icon={ICONS.pending}
          sub={pendingCount > 0 ? 'Needs attention' : 'All caught up'}
          subTone={pendingCount > 0 ? 'gold' : 'neutral'}
        />
        <StatCard
          label="Total Revenue"
          value={formatINR(totalRevenue)}
          icon={ICONS.revenue}
          sub={revenueSub}
          subTone={revenueTone}
        />
      </div>

      {/* Order Status Overview */}
      <section className="card dash-section">
        <div className="dash-section-head">
          <h2>Order Status Overview</h2>
          <span className="dash-section-sub">Live counts across all orders</span>
        </div>
        <div className="dash-status-grid">
          {STATUS_META.map((s) => {
            const count = counts[s.key] ?? 0
            const pct = totalOrders ? Math.round((count / totalOrders) * 100) : 0
            return (
              <div className={`dash-status-card dash-status-card--${s.tone}`} key={s.key}>
                <span className="dash-status-icon" aria-hidden="true">{s.icon}</span>
                <div className="dash-status-text">
                  <span className="dash-status-label">{s.key}</span>
                  <strong className="dash-status-count">{count}</strong>
                </div>
                <div className="dash-status-bar" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Revenue Overview + Needs Attention */}
      <div className="dash-row">
        <section className="card dash-section">
          <div className="dash-section-head dash-section-head--split">
            <div>
              <h2>Revenue Overview</h2>
              <span className="dash-section-sub">{formatINR(periodTotal)} in selected period</span>
            </div>
            <div className="dash-period-tabs" role="group" aria-label="Revenue period">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={period === p.value ? 'is-active' : ''}
                  onClick={() => setPeriod(p.value)}
                  aria-pressed={period === p.value}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <RevenueChart points={chartPoints} />
        </section>

        <section className="card dash-section">
          <div className="dash-section-head">
            <h2>Needs Attention</h2>
            <span className="dash-section-sub">Real items requiring action</span>
          </div>
          <div className="dash-attention">
            {pendingCount === 0 && pendingPayments.length === 0 ? (
              <p className="dash-attention-empty">✓ No orders require attention</p>
            ) : (
              <>
                {pendingCount > 0 && (
                  <div className="dash-attention-item">
                    <span className="dash-attention-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 3 2 21h20L12 3z" /><path d="M12 10v4M12 17.5v.5" />
                      </svg>
                    </span>
                    <p className="dash-attention-text"><strong>{pendingCount} orders awaiting confirmation</strong></p>
                    <Link to="/admin/orders" className="dash-attention-link">Review Orders →</Link>
                  </div>
                )}
                {pendingPayments.length > 0 && (
                  <div className="dash-attention-item">
                    <span className="dash-attention-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="9" /><path d="M12 7v10M15 9.5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H8" />
                      </svg>
                    </span>
                    <p className="dash-attention-text"><strong>{pendingPayments.length} orders pending payment</strong></p>
                    <Link to="/admin/orders" className="dash-attention-link">Check Payments →</Link>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Recent Orders + Top Selling Products */}
      <div className="dash-row">
        <section className="card dash-section">
          <div className="dash-section-head dash-section-head--split">
            <div>
              <h2>Recent Orders</h2>
              <span className="dash-section-sub">Latest {recentOrders.length} orders</span>
            </div>
            <Link to="/admin/orders" className="btn btn-outline btn-sm">View All →</Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="dash-empty">No orders yet.</p>
          ) : (
            <>
              <div className="table-scroll dash-recent-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order #</th><th>Customer</th><th>Date</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th aria-label="Action" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="dash-recent-id" title={o.order_number}>{o.order_number}</td>
                        <td className="dash-recent-customer">{o.customer_name}</td>
                        <td className="dash-recent-date">
                          <span>{formatOrderDate(o.created_at)}</span>
                          <span className="dash-recent-time">{formatOrderTime(o.created_at)}</span>
                        </td>
                        <td className="dash-recent-items">{formatItemsCount(o.items?.length)}</td>
                        <td className="dash-recent-amount">{formatINR(o.total_amount)}</td>
                        <td><span className="dash-recent-payment">{o.payment_method || 'Cash on Delivery'}</span></td>
                        <td><AdminStatusBadge status={o.status} /></td>
                        <td><Link to={`/admin/orders?open=${o.id}`} className="dash-recent-view">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="dash-recent-cards">
                {recentOrders.map((o) => (
                  <div className="dash-recent-card" key={o.id}>
                    <div className="dash-recent-top">
                      <span className="dash-recent-id" title={o.order_number}>{o.order_number}</span>
                      <AdminStatusBadge status={o.status} />
                    </div>
                    <span className="dash-recent-customer">{o.customer_name}</span>
                    <div className="dash-recent-bottom">
                      <span className="dash-recent-date">
                        {formatOrderDate(o.created_at)} · {formatItemsCount(o.items?.length)}
                      </span>
                      <span className="dash-recent-amount">{formatINR(o.total_amount)}</span>
                    </div>
                    <div className="dash-recent-card-foot">
                      <span className="dash-recent-payment">{o.payment_method || 'Cash on Delivery'}</span>
                      <Link to={`/admin/orders?open=${o.id}`} className="dash-recent-view">View →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card dash-section">
          <div className="dash-section-head dash-section-head--split">
            <div>
              <h2>Top Selling Products</h2>
              <span className="dash-section-sub">By units sold</span>
            </div>
            <Link to="/admin/products" className="btn btn-outline btn-sm">All Products →</Link>
          </div>

          {top.length === 0 ? (
            <p className="dash-empty">No sales data available.</p>
          ) : (
            <ol className="dash-top-list">
              {top.map((t, i) => (
                <li key={t.name}>
                  <span className="dash-top-rank" aria-hidden="true">{i + 1}</span>
                  {t.image ? (
                    <img className="dash-top-thumb" src={t.image} alt="" loading="lazy" />
                  ) : (
                    <span className="dash-top-thumb dash-top-thumb--ph" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 7 12 3 4 7v10l8 4 8-4V7Z" /><path d="M4 7l8 4 8-4M12 11v10" />
                      </svg>
                    </span>
                  )}
                  <div className="dash-top-info">
                    <strong className="dash-top-name">{t.name}</strong>
                    <span className="dash-top-meta">{t.qty} sold · {formatINR(t.revenue)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
