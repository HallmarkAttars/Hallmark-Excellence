import { Link } from 'react-router-dom'
import { FOOTER, BUSINESS } from '../../data/content'
import { IMAGES } from '../../config/assets'
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

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
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
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>{FOOTER.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
