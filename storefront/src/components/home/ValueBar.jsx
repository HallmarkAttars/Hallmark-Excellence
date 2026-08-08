import Reveal from '../../animations/Reveal'
import { HOME_VALUES } from '../../data/content'
import { AlcoholFreeIcon, RabbitIcon, BoxIcon, QualityIcon } from '../icons'
import './ValueBar.css'

// The reference's bottom value-proposition bar — a slim cream strip shown
// before the footer on desktop (the mobile reference omits it, so it is
// hidden below 768px). Content comes from content.js (HOME_VALUES).

const ICONS = {
  alcohol: <AlcoholFreeIcon />,
  cruelty: <RabbitIcon />,
  packaging: <BoxIcon />,
  trusted: <QualityIcon />,
}

export default function ValueBar() {
  return (
    <Reveal as="section" className="valuebar" aria-label="Our promise">
      <div className="container">
        <div className="valuebar-panel">
          {HOME_VALUES.items.map((item) => (
            <div key={item.key} className="valuebar-item">
              <span className="valuebar-icon" aria-hidden="true">
                {ICONS[item.key]}
              </span>
              <span className="valuebar-copy">
                <span className="valuebar-title">{item.title}</span>
                <span className="valuebar-subtitle">{item.subtitle}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  )
}
