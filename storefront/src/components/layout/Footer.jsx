import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FOOTER, BUSINESS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import Reveal from '../../animations/Reveal'
import './Footer.css'

<<<<<<< HEAD
function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v4a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4Z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

// Inline SVG social icons — resolved by the social `key` from BUSINESS,
// mirroring the reference project's SOCIAL_ICONS[ key ] lookup.
const SOCIAL_ICONS = {
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.8" fill="currentColor" /></svg>
  ),
  facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9h3V5h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V9a1 1 0 0 1 1-1Z" /></svg>
  ),
  whatsapp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.3A8.5 8.5 0 1 1 21 11.5Z" /></svg>
  ),
}
=======
const QUICK_LINKS = [
  { to: '/shop', label: 'Shop All' },
  { to: '/categories', label: 'Categories' },
  { to: '/brand/arees', label: 'Arees' },
  { to: '/brand/dahab', label: 'Dahab' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
]

const CATEGORY_LINKS = [
  { to: '/categories/attars', label: 'Attars' },
  { to: '/categories/oud', label: 'Oud' },
  { to: '/categories/floral', label: 'Floral' },
  { to: '/categories/musk', label: 'Musk' },
  { to: '/categories/bakhoor', label: 'Bakhoor' },
  { to: '/categories/gift-sets', label: 'Gift Sets' },
]

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" /></svg>
    ),
  },
  {
    label: 'Facebook',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 9h3V5h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V9a1 1 0 0 1 1-1Z" /></svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.3A8.5 8.5 0 1 1 21 11.5Z" /></svg>
    ),
  },
]

const PAYMENT_METHODS = [
  'Visa', 'Mastercard', 'UPI', 'NetBanking', 'COD'
]
>>>>>>> ee0909d (fix the tracker)

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
      setTimeout(() => setSubscribed(false), 3000)
    }
  }

  return (
    <footer className="footer">
<<<<<<< HEAD
      <div className="footer-inner">
        <Reveal as="div" className="footer-grid stagger-fade">
          {/* Brand */}
          <div className="footer-brand">
            <img src={IMAGES.logoLight} alt={BUSINESS.name} className="footer-logo-img" loading="lazy" />
            <p className="footer-description">{FOOTER.description}</p>
            <div className="footer-social" aria-label="Social media links">
              {BUSINESS.social.map((social) => (
                <a key={social.key} href={social.href} aria-label={social.label}>
                  {SOCIAL_ICONS[social.key]}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns — array-driven from content.js */}
          {FOOTER.columns.map((column) => (
            <nav key={column.heading} className="footer-col" aria-label={column.heading}>
              <h4>{column.heading}</h4>
              {column.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}

          {/* Contact — single source of truth in BUSINESS */}
          <div className="footer-col footer-contact">
            <h4>Contact</h4>
            <a className="footer-contact-row" href={`tel:${BUSINESS.phoneTel}`}>
              <PhoneIcon />
              <span>{BUSINESS.phoneDisplay}</span>
            </a>
            <a className="footer-contact-row" href={`mailto:${BUSINESS.email}`}>
              <MailIcon />
              <span>{BUSINESS.email}</span>
            </a>
            <p className="footer-contact-row">
              <LocationIcon />
              <span>{BUSINESS.address}</span>
            </p>
          </div>
        </Reveal>
=======
      {/* ─── Newsletter ─── */}
      <div className="footer-newsletter">
        <div className="container footer-newsletter-inner">
          <div className="footer-newsletter-text">
            <h3>Join the Inner Circle</h3>
            <p>Be the first to receive new drops, limited editions, and fragrance stories.</p>
          </div>
          <form className="footer-newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email for newsletter"
            />
            <button type="submit" className="btn btn-gold">
              {subscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          </form>
        </div>
>>>>>>> ee0909d (fix the tracker)
      </div>

      {/* ─── Main Footer Content ─── */}
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" viewTransition className="footer-logo">
            <span className="footer-logo-text">Arees &amp; Dahab</span>
          </Link>
          <p className="footer-brand-desc">
            The Art of Significance Attars — small-batch oils crafted from oud, rose, and
            resin, made to be worn close and remembered long after.
          </p>
          <div className="footer-contact-info">
            <p>+91 98765 43210</p>
            <p>hello@areesdahab.com</p>
            <p>12 Attar Lane, Chennai, Tamil Nadu 600001</p>
          </div>
        </div>

        <div className="footer-links-col">
          <h4>Quick Links</h4>
          <nav aria-label="Quick links">
            {QUICK_LINKS.map((link) => (
              <Link key={link.to} to={link.to} viewTransition>{link.label}</Link>
            ))}
          </nav>
        </div>

        <div className="footer-links-col">
          <h4>Categories</h4>
          <nav aria-label="Product categories">
            {CATEGORY_LINKS.map((link) => (
              <Link key={link.to} to={link.to} viewTransition>{link.label}</Link>
            ))}
          </nav>
        </div>

        <div className="footer-social-col">
          <h4>Follow Us</h4>
          <div className="footer-social" aria-label="Social media links">
            {SOCIAL_LINKS.map((social) => (
              <a key={social.label} href={social.href} aria-label={social.label}>
                {social.icon}
              </a>
            ))}
          </div>

          <div className="footer-payment">
            <h4>We Accept</h4>
            <div className="footer-payment-icons">
              {PAYMENT_METHODS.map((method) => (
                <span key={method} className="footer-payment-item">{method}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Bar ─── */}
      <div className="footer-bottom">
<<<<<<< HEAD
        <div className="footer-bottom-inner">
          <p>{FOOTER.copyright}</p>
=======
        <div className="container footer-bottom-inner">
          <p>&copy; {new Date().getFullYear()} Arees &amp; Dahab. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
>>>>>>> ee0909d (fix the tracker)
        </div>
      </div>
    </footer>
  )
}
