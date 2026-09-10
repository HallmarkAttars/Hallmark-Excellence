import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { FOOTER, BUSINESS } from '../../data/content'
import { IMAGES } from '../../config/assets'
import { sortBrandsByDisplayOrder } from '../../utils/brandOrder'
import Reveal from '../../animations/Reveal'
import './Footer.css'

const WHATSAPP_URL =
  'https://wa.me/919840078909?text=Can%20I%20get%20more%20info%20about%20your%20products%3F'

function ChevronDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

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
  // Live brand list for the Shop column — shared from the CartContext fetch
  // of /api/brands (same state as the header dropdown), so Admin renames and
  // positions show up here too. A failure simply leaves the column with its
  // static links (All Attars / Categories).
  const { brands } = useCart()
  const brandLinks = sortBrandsByDisplayOrder(brands)

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  const [openSections, setOpenSections] = useState({
    Shop: false,
    Company: false,
    Contact: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
    } else if (mql.addListener) {
      mql.addListener(handler)
    }
    setIsMobile(mql.matches)
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handler)
      } else if (mql.removeListener) {
        mql.removeListener(handler)
      }
    }
  }, [])

  const toggleSection = (heading) => {
    setOpenSections((prev) => ({
      ...prev,
      [heading]: !prev[heading],
    }))
  }

  return (
    <footer className="footer">
      <div className="footer-inner">
        <Reveal as="div" className="footer-grid stagger-fade">
          {/* Brand */}
          <div className="footer-brand">
            <img src={IMAGES.logoLight} alt={BUSINESS.name} className="footer-logo-img" loading="lazy" />
            <p className="footer-description">{FOOTER.description}</p>
            <div className="footer-social" aria-label="Social media links">
              {BUSINESS.social.map((social) => {
                const href =
                  social.key === 'whatsapp' && (!social.href || social.href === '#')
                    ? WHATSAPP_URL
                    : social.href
                return (
                  <a
                    key={social.key}
                    href={href}
                    aria-label={social.label}
                    {...(social.key === 'whatsapp' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {SOCIAL_ICONS[social.key]}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Link columns — Shop, Company */}
          {FOOTER.columns.map((column) => {
            const isOpen = !!openSections[column.heading]
            const sectionId = `footer-section-${column.heading.toLowerCase()}`
            const triggerId = `footer-trigger-${column.heading.toLowerCase()}`

            return (
              <nav key={column.heading} className="footer-col" aria-label={column.heading}>
                {isMobile ? (
                  <button
                    type="button"
                    id={triggerId}
                    className={`footer-accordion-btn ${isOpen ? 'is-open' : ''}`}
                    aria-expanded={isOpen}
                    aria-controls={sectionId}
                    onClick={() => toggleSection(column.heading)}
                  >
                    <span className="footer-col-title">{column.heading}</span>
                    <span className="footer-accordion-caret" aria-hidden="true">
                      <ChevronDownIcon />
                    </span>
                  </button>
                ) : (
                  <h4>{column.heading}</h4>
                )}

                <div
                  id={sectionId}
                  role={isMobile ? 'region' : undefined}
                  aria-labelledby={isMobile ? triggerId : undefined}
                  className={`footer-accordion-content ${isMobile && isOpen ? 'is-open' : ''}`}
                >
                  {column.links.map((link) => (
                    <Link key={link.to} to={link.to}>
                      {link.label}
                    </Link>
                  ))}
                  {/* Shop column — the brand links come from the LIVE brand list
                      (active brands, admin-ordered), never hard-coded copy. */}
                  {column.heading === 'Shop' &&
                    brandLinks.map((brand) => (
                      <Link key={brand.slug} to={`/brand/${brand.slug}`}>
                        {brand.name}
                      </Link>
                    ))}
                </div>
              </nav>
            )
          })}

          {/* Contact — single source of truth in BUSINESS */}
          {(() => {
            const isContactOpen = !!openSections['Contact']
            const contactSectionId = 'footer-section-contact'
            const contactTriggerId = 'footer-trigger-contact'

            return (
              <div className="footer-col footer-contact">
                {isMobile ? (
                  <button
                    type="button"
                    id={contactTriggerId}
                    className={`footer-accordion-btn ${isContactOpen ? 'is-open' : ''}`}
                    aria-expanded={isContactOpen}
                    aria-controls={contactSectionId}
                    onClick={() => toggleSection('Contact')}
                  >
                    <span className="footer-col-title">Contact</span>
                    <span className="footer-accordion-caret" aria-hidden="true">
                      <ChevronDownIcon />
                    </span>
                  </button>
                ) : (
                  <h4>Contact</h4>
                )}

                <div
                  id={contactSectionId}
                  role={isMobile ? 'region' : undefined}
                  aria-labelledby={isMobile ? contactTriggerId : undefined}
                  className={`footer-accordion-content ${isMobile && isContactOpen ? 'is-open' : ''}`}
                >
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
                  <a
                    className="footer-whatsapp-cta"
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Chat with us on WhatsApp</span>
                    <span className="footer-whatsapp-arrow" aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            )
          })()}
        </Reveal>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>© 2026 Arees & Dahab. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
