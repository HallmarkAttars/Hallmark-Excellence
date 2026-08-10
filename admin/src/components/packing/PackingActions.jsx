// ============================================================================
// Reusable packing-label action buttons (admin only).
// Both guard against rapid repeat clicks and surface safe error messages.
// The PDF module is lazy-loaded only when actually needed.
// ============================================================================

import { useState } from 'react'
import './PackingActions.css'

const GENERIC_ERROR = 'Unable to generate the packing label. Please try again.'

function PrinterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function PackingLabelPrintButton({ order, className = '', compact = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    // Open the print window synchronously (inside the click gesture) so
    // popup blockers never reject it.
    const win = window.open('', '_blank', 'width=760,height=920')
    if (!win) {
      setError(GENERIC_ERROR)
      setBusy(false)
      return
    }
    try {
      const { printPackingLabels } = await import('./packingLabelPdf')
      await printPackingLabels([order], { win })
    } catch (err) {
      console.error('[packing] print failed:', err)
      if (win && !win.closed) win.close()
      setError(GENERIC_ERROR)
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <span className="packing-action">
        <button
          type="button"
          className="packing-icon-btn"
          onClick={handle}
          disabled={busy}
          aria-label={`Print packing label for ${order?.order_number || 'order'}`}
          title={busy ? 'Preparing…' : 'Print packing label'}
        >
          {busy ? <span className="packing-spinner" aria-hidden="true" /> : <PrinterIcon />}
        </button>
        {error && <span className="packing-action-error" role="alert">{error}</span>}
      </span>
    )
  }

  return (
    <span className="packing-action">
      <button type="button" className={`btn ${className}`} onClick={handle} disabled={busy}>
        {busy ? 'Preparing…' : 'Print Label'}
      </button>
      {error && <span className="packing-action-error" role="alert">{error}</span>}
    </span>
  )
}

export function PackingLabelDownloadButton({ order, className = '', compact = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const { downloadPackingLabels } = await import('./packingLabelPdf')
      await downloadPackingLabels([order])
    } catch (err) {
      console.error('[packing] download failed:', err)
      setError(GENERIC_ERROR)
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <span className="packing-action">
        <button
          type="button"
          className="packing-icon-btn"
          onClick={handle}
          disabled={busy}
          aria-label={`Download packing label for ${order?.order_number || 'order'}`}
          title={busy ? 'Generating…' : 'Download packing label'}
        >
          {busy ? <span className="packing-spinner" aria-hidden="true" /> : <DownloadIcon />}
        </button>
        {error && <span className="packing-action-error" role="alert">{error}</span>}
      </span>
    )
  }

  return (
    <span className="packing-action">
      <button type="button" className={`btn ${className}`} onClick={handle} disabled={busy}>
        {busy ? 'Generating…' : 'Download Label'}
      </button>
      {error && <span className="packing-action-error" role="alert">{error}</span>}
    </span>
  )
}
