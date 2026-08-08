import Reveal from '../../animations/Reveal'
import { HOME_BENEFITS } from '../../data/content'
import { ShippingIcon, ReturnsIcon, SecureIcon } from '../icons'
import './BenefitsBar.css'

// The reference's overlapping feature bar: a white rounded card straddling
// the hero's bottom edge, divided into three columns (Free Shipping /
// Easy Returns / Secure Payment). Content comes from content.js (HOME_BENEFITS);
// icons are resolved by `key` via the shared icons module.

const ICONS = {
  shipping: <ShippingIcon />,
  returns: <ReturnsIcon />,
  secure: <SecureIcon />,
}

export default function BenefitsBar() {
  return (
    <Reveal as="section" className="benefits-bar" aria-label="Store benefits">
      <div className="benefits-bar-card">
        {HOME_BENEFITS.map((benefit) => (
          <div key={benefit.key} className="benefit-item">
            <span className="benefit-icon" aria-hidden="true">
              {ICONS[benefit.key]}
            </span>
            <span className="benefit-copy">
              <span className="benefit-title">{benefit.title}</span>
              <span className="benefit-subtitle">{benefit.subtitle}</span>
            </span>
          </div>
        ))}
      </div>
    </Reveal>
  )
}
