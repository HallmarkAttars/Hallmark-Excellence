// ============================================================================
// Reusable invoice action buttons. Both guard against rapid repeat clicks
// (one PDF at a time) and surface only customer-safe error messages.
// ============================================================================

import { useState } from 'react'
import { INVOICE_LOGO } from './invoiceAssets'
import './InvoiceActions.css'

const GENERIC_ERROR = 'Unable to generate the invoice. Please try again.'

export function InvoiceDownloadButton({ order, className = '' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      // Lazy-load jsPDF only when actually needed — keeps the main bundle lean.
      const { downloadInvoicePdf } = await import('./invoicePdf')
      await downloadInvoicePdf(order, { logoUrl: INVOICE_LOGO })
    } catch (err) {
      // Real error logged for diagnosis; customers see only the safe message.
      console.error('[invoice] download failed:', err)
      setError(GENERIC_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="invoice-action">
      <button type="button" className={`btn ${className}`} onClick={handle} disabled={busy}>
        {busy ? 'Generating invoice…' : 'Download Invoice'}
      </button>
      {error && <span className="invoice-action-error" role="alert">{error}</span>}
    </span>
  )
}

export function InvoicePrintButton({ order, className = '' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    // Open the print window synchronously (inside the click gesture) BEFORE
    // the lazy import resolves, so popup blockers never reject it.
    const win = window.open('', '_blank', 'width=900,height=1100')
    if (!win) {
      setError(GENERIC_ERROR)
      setBusy(false)
      return
    }
    try {
      const { printInvoice } = await import('./invoicePdf')
      await printInvoice(order, { logoUrl: INVOICE_LOGO, win })
    } catch (err) {
      console.error('[invoice] print failed:', err)
      if (win && !win.closed) win.close()
      setError(GENERIC_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="invoice-action">
      <button type="button" className={`btn ${className}`} onClick={handle} disabled={busy}>
        {busy ? 'Preparing invoice…' : 'Print Invoice'}
      </button>
      {error && <span className="invoice-action-error" role="alert">{error}</span>}
    </span>
  )
}
