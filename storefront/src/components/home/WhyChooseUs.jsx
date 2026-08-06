import './WhyChooseUs.css'

function LeafIcon() {
  return (
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

const FEATURES = [
  {
    icon: <LeafIcon />,
    title: 'Natural Ingredients',
    subtitle: 'Sustainably Sourced',
  },
  {
    icon: <ShieldIcon />,
    title: 'Authenticity Guaranteed',
    subtitle: 'Official Retailer',
  },
  {
    icon: <TruckIcon />,
    title: 'Free Delivery',
    subtitle: 'On Orders Over ₹999',
  },
  {
    icon: <CraftIcon />,
    title: 'Master Crafted',
    subtitle: 'Award-Winning',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="choose-section" aria-label="Why choose us">
      <div className="container">
        <h2 className="section-title-upper choose-title-heading">Why Choose Us</h2>
        <div className="choose-grid">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="choose-item">
              <span className="choose-icon-ring" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="choose-title">{feature.title}</h3>
              <p className="choose-subtitle">{feature.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
