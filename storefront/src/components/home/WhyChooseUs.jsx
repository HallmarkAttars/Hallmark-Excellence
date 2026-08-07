<<<<<<< HEAD
import Reveal from '../../animations/Reveal'
import { WHY_CHOOSE_US } from '../../data/content'
import './WhyChooseUs.css'

// Inline SVG icons — resolved by the item `key` from content.js, mirroring the
// reference project's assets.js icon-key lookup (WHY_ICONS[item.key]).
const ICONS = {
  natural: <LeafIcon />,
  authenticity: <ShieldIcon />,
  delivery: <TruckIcon />,
  craft: <CraftIcon />,
}
=======
import Reveal from '../ui/Reveal'
import './WhyChooseUs.css'

const FEATURES = [
  {
    number: '25+',
    title: 'Years Experience',
    subtitle: 'Master blenders crafting signature attars since 1999.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    number: '100%',
    title: 'Authentic Products',
    subtitle: 'Every attar is directly sourced, hand-blended and guaranteed genuine.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    number: 'Secure',
    title: 'Payment & Delivery',
    subtitle: 'Safe checkout with insured shipments across India and worldwide.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="22" height="13" rx="2" />
        <path d="M7 20h10" />
        <path d="M9 16v4" />
        <path d="M15 16v4" />
      </svg>
    ),
  },
  {
    number: 'Premium',
    title: 'Customer Support',
    subtitle: 'Dedicated concierge team ready to guide your fragrance journey.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]
>>>>>>> ee0909d (fix the tracker)

function LeafIcon() {
  return (
<<<<<<< HEAD
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16Z" />
      <path d="M4 20c4-6 8-10 12-12" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.4 7.5 10 4.3-1.6 7.5-5.4 7.5-10v-6L12 2.5Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 5.5h12v10h-12z" />
      <path d="M14.5 9.5h3.4l3.1 3.1v2.9h-6.5" />
      <circle cx="6.5" cy="18.5" r="1.7" />
      <circle cx="17.5" cy="18.5" r="1.7" />
    </svg>
  )
}

function CraftIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 15.5 8.5 21 9.5l-4.5 4.2L17.4 20 12 17l-5.4 3 1-6.3L3 9.5l5.5-1L12 3Z" />
    </svg>
  )
}

export default function WhyChooseUs() {
  return (
    <Reveal as="section" className="choose-section" aria-label="Why choose us">
      <div className="container">
        <h2 className="section-title-upper choose-title-heading">{WHY_CHOOSE_US.title}</h2>
        <div className="choose-grid stagger-fade">
          {WHY_CHOOSE_US.items.map((feature) => (
            <div key={feature.key} className="choose-item">
              <span className="choose-icon-ring" aria-hidden="true">
                {ICONS[feature.key]}
              </span>
              <h3 className="choose-title">{feature.title}</h3>
              <p className="choose-subtitle">{feature.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  )
}
=======
    <section className="trust-section">
      <div className="container">
        <Reveal animation="fade-up" duration={800}>
          <div className="section-header">
            <span className="section-eyebrow">Why Choose Us</span>
            <h2>A Trusted Experience</h2>
            <p>
              For over two decades, we have dedicated ourselves to the art of fine fragrance —
              every bottle tells a story of authenticity, craftsmanship, and care.
            </p>
          </div>
        </Reveal>

        <div className="trust-grid">
          {FEATURES.map((feature, i) => (
            <Reveal
              key={feature.title}
              animation="fade-up"
              duration={600}
              delay={i * 100}
              options={{ threshold: 0.15 }}
            >
              <div className="trust-card">
                <div className="trust-card-icon">
                  {feature.icon}
                </div>
                <div className="trust-card-number">{feature.number}</div>
                <h3 className="trust-card-title">{feature.title}</h3>
                <p className="trust-card-subtitle">{feature.subtitle}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
>>>>>>> ee0909d (fix the tracker)
