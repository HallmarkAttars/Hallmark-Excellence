import './WhyChooseUs.css'

const FEATURES = [
  {
    icon: '/leaf.svg',
    title: 'Natural Ingredients',
    subtitle: 'Sustainably Sourced',
  },
  {
    icon: '/star.svg',
    title: 'Master Crafted',
    subtitle: 'Award-Winning',
  },
  {
    icon: '/truck.svg',
    title: 'Free Delivery',
    subtitle: 'On Orders Over ₹999',
  },
  {
    icon: '/sheild.svg',
    title: 'Authenticity Guaranteed',
    subtitle: 'Official Retailer',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="choose-section">
      <div className="choose-grid">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="choose-item">
            <img src={feature.icon} alt={feature.title} className="choose-icon" />
            <h3 className="choose-title">{feature.title}</h3>
            <p className="choose-subtitle">{feature.subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

