import { Link } from 'react-router-dom'
import './Footer.css'

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

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <img src="/HE white Logo.png" alt="Arees & Dahab" className="footer-logo-img" loading="lazy" />
            <p className="footer-description">
              The Art of Significance Attars — small-batch oils crafted from oud, rose, and
              resin, made to be worn close and remembered long after.
            </p>
            <div className="footer-social" aria-label="Social media links">
              <a href="#" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.8" fill="currentColor" /></svg>
              </a>
              <a href="#" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9h3V5h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V9a1 1 0 0 1 1-1Z" /></svg>
              </a>
              <a href="#" aria-label="WhatsApp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.3A8.5 8.5 0 1 1 21 11.5Z" /></svg>
              </a>
            </div>
          </div>

          {/* Shop */}
          <nav className="footer-col" aria-label="Shop">
            <h4>Shop</h4>
            <Link to="/shop">All Attars</Link>
            <Link to="/categories">Categories</Link>
            <Link to="/brand/arees">Arees</Link>
            <Link to="/brand/dahab">Dahab</Link>
          </nav>

          {/* Company */}
          <nav className="footer-col" aria-label="Company">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
          </nav>

          {/* Contact */}
          <div className="footer-col footer-contact">
            <h4>Contact</h4>
            <a className="footer-contact-row" href="tel:+919876543210">
              <PhoneIcon />
              <span>+91 98765 43210</span>
            </a>
            <a className="footer-contact-row" href="mailto:hello@areesdahab.com">
              <MailIcon />
              <span>hello@areesdahab.com</span>
            </a>
            <p className="footer-contact-row">
              <LocationIcon />
              <span>83 Moore Street, Mannady, Chennai, Tamil Nadu 600001</span>
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>&copy; {new Date().getFullYear()} Arees &amp; Dahab. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
