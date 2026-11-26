import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ANNOUNCEMENTS } from '../../data/content'
import './AnnouncementBar.css'

const ROTATE_MS = 4000

/**
 * AnnouncementBar — a slim rotating message bar above the header.
 *
 * Rotates through the factual ANNOUNCEMENTS messages every 4s, pauses while
 * hovered or focused, and stays static for users who prefer reduced motion.
 */
export default function AnnouncementBar() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = ANNOUNCEMENTS.length

  useEffect(() => {
    if (count <= 1 || paused) return
    const id = setTimeout(() => setActive((i) => (i + 1) % count), ROTATE_MS)
    return () => clearTimeout(id)
  }, [active, count, paused])

  if (count === 0) return null

  const item = ANNOUNCEMENTS[active]

  return (
    <div
      className="announcement-bar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="announcement-bar-inner container" aria-live="polite">
        <Link key={item.to} to={item.to} className="announcement-item">
          {item.label}
          <span className="announcement-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  )
}
