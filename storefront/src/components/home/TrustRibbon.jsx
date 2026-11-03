// Homepage trust ribbon — five factual, slogan-free assurances shown directly
// under the hero. Every claim is sourced from the pages it links to:
//   * alcohol-free + authenticity — product copy and the About page
//   * advance payment via UPI — the only selectable checkout payment method
//   * pan-India delivery — Shipping & Returns (/shipping-returns)
//   * wholesale/export — /wholesale, /hikma-exports
// Text-only with inline SVG icons: no images, no data, no LCP impact.
import { Link } from 'react-router-dom'
import './TrustRibbon.css'

function AlcoholFreeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3h8M12 3v6l-5.5 9a3 3 0 0 0 2.6 4.5h5.8a3 3 0 0 0 2.6-4.5L12 9" />
      <path d="M4 4l16 16" />
    </svg>
  )
}

function FlaskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3h6M10 3v5.2L4.9 17A2.6 2.6 0 0 0 7.2 21h9.6a2.6 2.6 0 0 0 2.3-4L14 8.2V3" />
      <path d="M7.5 15h9" />
    </svg>
  )
}

function UpiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6 15h4" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 6h11v10H2.5zM13.5 10H18l3 3v3h-7.5" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  )
}

const TRUST_ITEMS = [
  { icon: AlcoholFreeIcon, label: '100% alcohol-free oils' },
  { icon: FlaskIcon, label: 'Authentic attars & oud' },
  { icon: UpiIcon, label: 'Advance payment via UPI' },
  {
    icon: TruckIcon,
    label: 'Pan-India delivery',
    to: '/shipping-returns',
  },
  {
    icon: ExportIcon,
    label: 'Wholesale & export support',
    to: '/hikma-exports',
  },
]

// Renders icon + label; links additionally get a trailing chevron that CSS
// shows on mobile only (tap-intent affordance) and hides on desktop.
export default function TrustRibbon() {
  return (
    <section className="trust-ribbon" aria-label="Why customers trust Arees Perfumes">
      <ul className="trust-ribbon-list">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon
          const body = (
            <>
              <span className="trust-ribbon-icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="trust-ribbon-label">{item.label}</span>
              {item.to ? (
                <span className="trust-ribbon-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </>
          )
          return (
            <li key={item.label} className="trust-ribbon-item">
              {item.to ? (
                <Link to={item.to} className="trust-ribbon-link">
                  {body}
                </Link>
              ) : (
                <span className="trust-ribbon-static">{body}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
