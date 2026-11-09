import { useSyncExternalStore } from 'react'
import { getCatalogStatus, subscribeCatalogStatus } from '../../utils/catalogStatus'
import { BUSINESS } from '../../data/content'
import { WHATSAPP_URL } from '../../utils/whatsapp'
import './CatalogOutageNotice.css'

// Shown app-wide when the catalogue API is unreachable and products are being
// served from the persisted last-good snapshot (or not at all). It tells the
// customer the catalogue is stale/unavailable and gives them a way to order
// right now instead of leaving an apparently empty shop.

const dateFormatter =
  typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
    ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

function formatSavedAt(savedAt) {
  if (!savedAt || !dateFormatter) return ''
  try {
    return dateFormatter.format(new Date(savedAt))
  } catch {
    return ''
  }
}

export default function CatalogOutageNotice() {
  const { offline, savedAt } = useSyncExternalStore(
    subscribeCatalogStatus,
    getCatalogStatus,
    getCatalogStatus
  )
  if (!offline) return null

  const savedDate = formatSavedAt(savedAt)

  return (
    <div className="catalog-outage" role="status" aria-live="polite">
      <div className="catalog-outage-inner">
        <p className="catalog-outage-text">
          <strong>Our live catalogue is temporarily unavailable.</strong>{' '}
          {savedDate
            ? `Showing products saved on ${savedDate} — prices and stock may have changed. `
            : 'Please try again in a moment. '}
          To confirm availability or order now, WhatsApp us or call{' '}
          <a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a>.
        </p>
        <div className="catalog-outage-actions">
          <a
            className="catalog-outage-whatsapp"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Order on WhatsApp
          </a>
          <button
            type="button"
            className="catalog-outage-retry"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
