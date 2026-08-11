import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBrands, getProducts } from '../services/mockApi'
import { useAuth } from '../context/AuthContext'
import './Brands.css'

// The storefront's exact five brands — the management screen is scoped to
// them. There is deliberately NO "Add Brand" button: new brands can only be
// created in the database, matching the fixed 5-brand storefront.
const EXPECTED_SLUGS = ['arees', 'dahab', 'misk-al-arab', 'oud-al-haramain', 'amber-oud']

// Brand card image — prefers the card artwork, then the cover, then a brand
// logo; null means the CSS monogram fallback renders instead (no broken img).
const brandImage = (b) => b.card_image_url || b.cover_image_url || b.logo_url || null

export default function Brands() {
  const { can } = useAuth()
  const canEdit = can('brands.edit')
  const [brands, setBrands] = useState([])
  const [productCounts, setProductCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([getBrands(), getProducts()])
      .then(([brandList, products]) => {
        if (!alive) return
        // Active/available products only, per the storefront rules — the
        // count reflects what customers can actually buy from each brand.
        const counts = {}
        products.forEach((p) => {
          if (p.brand_id && p.is_active !== false) counts[p.brand_id] = (counts[p.brand_id] || 0) + 1
        })
        // Only the five storefront brands, ordered by display position
        // (unknown/null positions sort after configured ones).
        const five = brandList
          .filter((b) => EXPECTED_SLUGS.includes(b.slug))
          .sort((a, b) => {
            const ao = a.display_order ?? Number.MAX_SAFE_INTEGER
            const bo = b.display_order ?? Number.MAX_SAFE_INTEGER
            if (ao !== bo) return ao - bo
            return EXPECTED_SLUGS.indexOf(a.slug) - EXPECTED_SLUGS.indexOf(b.slug)
          })
        setBrands(five)
        setProductCounts(counts)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message || 'Failed to load brands.')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="brands-page">
      <div className="page-header">
        <h1>Brands</h1>
        <Link to="/admin/brands/bulk-pricing" className="btn btn-outline btn-sm">
          Bulk Pricing
        </Link>
      </div>

      <p className="brands-intro">
        Manage the storefront's five brands — copy, imagery, position, featured/standard
        placement and active state.
      </p>

      {error && <p className="login-error brands-error">{error}</p>}

      {loading ? (
        <div className="loading-state">Loading brands…</div>
      ) : brands.length === 0 ? (
        <div className="empty-state">No brands found.</div>
      ) : (
        <div className="brands-grid">
          {brands.map((brand) => {
            const image = brandImage(brand)
            const active = brand.is_active !== false
            return (
              <div key={brand.id} className="card brand-card">
                <div className="brand-card-media">
                  {image ? (
                    <img src={image} alt={brand.name} loading="lazy" />
                  ) : (
                    <span className="brand-card-monogram" aria-hidden="true">
                      {brand.name.charAt(0)}
                    </span>
                  )}
                  <span className={`brand-card-type ${brand.display_type === 'featured' ? 'is-featured' : ''}`}>
                    {brand.display_type === 'featured' ? 'Featured' : 'Standard'}
                  </span>
                </div>

                <div className="brand-card-body">
                  <h2>{brand.name}</h2>
                  <p className="brand-card-collection">
                    {brand.collection_label || `${brand.name} Collection`}
                  </p>
                  {brand.description && <p className="brand-card-desc">{brand.description}</p>}

                  <div className="brand-card-meta">
                    <span className="brand-card-stat">
                      <strong>{productCounts[brand.id] || 0}</strong> products
                    </span>
                    <span className={`brand-card-status ${active ? 'is-active' : ''}`}>
                      {active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="brand-card-position">
                      Position {brand.display_order ?? '—'}
                    </span>
                  </div>

                  <div className="brand-card-actions">
                    <Link to={`/admin/brands/${brand.slug}`} className="btn btn-outline btn-sm">
                      Manage Products
                    </Link>
                    {canEdit ? (
                      <Link to={`/admin/brands/${brand.slug}/edit`} className="btn btn-gold btn-sm">
                        Edit
                      </Link>
                    ) : (
                      <span className="brand-card-locked" title="You need edit permission to change brand details.">
                        Edit
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
