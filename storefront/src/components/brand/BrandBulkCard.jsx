import { useMemo } from 'react'
import { useCart } from '../../context/CartContext'
import { isBrandBulkEnabled } from '../../utils/bulk'
import './BrandBulkCard.css'

// ============================================================================
// BrandBulkCard — ONE responsive bulk-pricing card for EVERY brand page
// (Arees, Dahab, …). Fed the brand's OWN database config — prices, threshold
// and on/off switch are never hardcoded, and Arees data can never appear on
// Dahab (or vice versa) because each page passes its own brand row.
//
// Bulk pricing is strictly OPTIONAL: when the brand has no valid combined
// bulk config (toggle off, or missing/invalid values), this renders NOTHING —
// no empty card, no ₹0, no undefined/null, no invented price. Normal
// purchasing is untouched either way.
//
// Responsive: the pricing table stays a real table on desktop and restacks
// into labelled rows on mobile so the QUANTITY / PRICE / PIECE / YOU SAVE
// columns are never clipped and the page never scrolls horizontally at
// 320–430px.
// ============================================================================

const fmt = (value) => `₹${Number(value).toLocaleString('en-IN')}`

export default function BrandBulkCard({ brand }) {
  const { items } = useCart()

  // Validated card config — mirrors the rule "show only when the brand's
  // combined bulk pricing is genuinely configured AND the bulk price is a
  // real discount below the brand's standard/reference price."
  const config = useMemo(() => {
    if (!brand || !isBrandBulkEnabled(brand)) return null
    const standardPrice = Number(brand.standard_price)
    const bulkUnitPrice = Number(brand.bulk_unit_price)
    const bulkMinQty = Number(brand.bulk_min_qty)
    if (
      !Number.isFinite(standardPrice) ||
      standardPrice <= 0 ||
      !(bulkUnitPrice < standardPrice)
    ) {
      // Partially-configured brand (e.g. standard price missing) → hide the
      // offer rather than show a misleading banner.
      return null
    }
    const savePerPiece = standardPrice - bulkUnitPrice
    return {
      standardPrice,
      bulkUnitPrice,
      bulkMinQty,
      savePerPiece,
      savePercent: Math.round((savePerPiece / standardPrice) * 100),
    }
  }, [brand])

  // Live combined quantity of THIS brand's items in the cart — derived from
  // the cart lines filtered by this brand's id, so Arees and Dahab never mix.
  // Used for the "quantity indicator" (your cart vs the threshold).
  const cartQty = useMemo(() => {
    if (!brand) return 0
    const id = String(brand.id)
    return items
      .filter((i) => String(i.brand_id) === id)
      .reduce((sum, i) => sum + Number(i.quantity || 0), 0)
  }, [items, brand])

  // Not configured → render nothing at all (bulk is optional).
  if (!config) return null

  const { standardPrice, bulkUnitPrice, bulkMinQty, savePerPiece, savePercent } = config
  const brandName = brand?.name || 'Brand'
  const unlocked = cartQty >= bulkMinQty
  const progressPct = Math.min(100, (cartQty / bulkMinQty) * 100)

  return (
    <section className="brand-bulk-card" aria-label={`${brandName} bulk pricing`}>
      <div className="brand-bulk-card-head">
        <p className="brand-bulk-card-title">{brandName} · Bulk Pricing</p>
        <p className="brand-bulk-card-sub">Combined-quantity discount</p>
        <p className="brand-bulk-card-desc">
          Mix &amp; match any {brandName} item. Discounts unlock when your total
          quantity across all items reaches {bulkMinQty} pieces.
        </p>
      </div>

      <div className="brand-bulk-table-wrap">
        <table className="brand-bulk-table">
          <thead>
            <tr>
              <th>Quantity</th>
              <th>Price / piece</th>
              <th>You Save</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Quantity">1 – {bulkMinQty - 1} pieces</td>
              <td data-label="Price / piece">{fmt(standardPrice)}</td>
              <td data-label="You Save" className="brand-bulk-standard">
                Standard rate
              </td>
            </tr>
            <tr className="brand-bulk-row-active">
              <td data-label="Quantity">{bulkMinQty}+ pieces</td>
              <td data-label="Price / piece">{fmt(bulkUnitPrice)}</td>
              <td data-label="You Save" className="brand-bulk-save">
                SAVE {fmt(savePerPiece)}/piece
                <span className="brand-bulk-save-pct">({savePercent}%)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Live quantity indicator — shown only when this brand's items are
          already in the visitor's cart. Recomputes on every cart change. */}
      {cartQty > 0 && (
        <div className="brand-bulk-cart" aria-live="polite">
          {unlocked ? (
            <p className="brand-bulk-cart-status is-unlocked">
              ✓ Bulk unlocked — {fmt(bulkUnitPrice)}/piece applies to all{' '}
              {brandName} items in your cart
            </p>
          ) : (
            <>
              <p className="brand-bulk-cart-status">
                Your cart: {cartQty} {cartQty === 1 ? 'piece' : 'pieces'} — add{' '}
                <strong>{bulkMinQty - cartQty} more</strong> to unlock{' '}
                {fmt(bulkUnitPrice)}/piece
              </p>
              <div
                className="brand-bulk-cart-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={bulkMinQty}
                aria-valuenow={cartQty}
                aria-label={`Progress toward ${brandName} bulk pricing`}
              >
                <div className="brand-bulk-cart-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="brand-bulk-cart-meta">
                {cartQty} / {bulkMinQty} pieces
              </p>
            </>
          )}
        </div>
      )}
    </section>
  )
}
