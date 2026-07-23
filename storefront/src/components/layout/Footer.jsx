import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/HE logo white.png" alt="HE Logo" className="footer-logo-img" />
          <p>
            The Art of Significance Attars — small-batch oils crafted from oud, rose, and
            resin, made to be worn close and remembered long after.
          </p>
          <div className="footer-social" aria-label="Social media links">
            <a href="#" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" /></svg>
            </a>
            <a href="#" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 9h3V5h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V9a1 1 0 0 1 1-1Z" /></svg>
            </a>
            <a href="#" aria-label="WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.3A8.5 8.5 0 1 1 21 11.5Z" /></svg>
            </a>
          </div>
        </div>

        <div className="footer-links">
          <h4>Quick Links</h4>
          <Link to="/shop">Shop</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/brand/arees">Arees</Link>
          <Link to="/brand/dahab">Dahab</Link>
          <Link to="/about">About Us</Link>
        </div>

        <div className="footer-contact">
          <h4>Contact</h4>
          <p>+91 98765 43210</p>
          <p>hello@areesdahab.com</p>
          <p>12 Attar Lane, Chennai, Tamil Nadu 600001</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Arees &amp; Dahab. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
