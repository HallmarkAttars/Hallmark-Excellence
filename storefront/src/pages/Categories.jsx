import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../animations/Reveal'
import { getCategories } from '../services/mockApi'
import { CATEGORIES_PAGE } from '../data/content'
import { cloudinarySrc } from '../utils/productImage'
// Single source of truth for the premium category-card look — the homepage
// CategoryGrid imports the same file, so both surfaces stay consistent.
import '../components/home/CategoryGrid.css'
import SkeletonCategoryGrid from '../components/skeleton/SkeletonCategoryGrid'
import SEO from '../components/seo/SEO'
import { buildBreadcrumbsSchema } from '../utils/seo'
import { normalizeCategorySlug } from '../utils/categorySlug'
import './Categories.css'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategories().then((c) => { setCategories(c); setLoading(false) })
  }, [])

  return (
    <div>
      <SEO
        title="All Fragrance Categories | Arees Perfumes"
        description="Explore all fragrance categories at Arees Perfumes. Discover pure attars, oud oils, musk, and traditional perfumes crafted with excellence in Chennai."
        canonical="/categories"
        schema={buildBreadcrumbsSchema([
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
        ])}
      />
      <div className="page-heading">
        <p className="eyebrow">{CATEGORIES_PAGE.eyebrow}</p>
        <h1>{CATEGORIES_PAGE.title}</h1>
        <p>{CATEGORIES_PAGE.subtitle}</p>
      </div>

      <div className="container">
        {loading ? (
          <SkeletonCategoryGrid count={8} />
        ) : (
          <Reveal className="category-scroll stagger-fade categories-page">
            {categories.map((cat) => {
              const imgSrc = cat.image ? cloudinarySrc(cat.image, { width: 500 }) : null
              return (
                <Link key={cat.id} to={`/categories/${normalizeCategorySlug(cat.slug)}`} className="category-card">
                  {/* Upper portion — category image. Optimized real <img>
                      (f_auto,q_auto,w_500) instead of a full-resolution CSS
                      background URL, with lazy decoding. */}
                  <span className="category-media">
                    {imgSrc ? (
                      <img
                        className="category-image"
                        src={imgSrc}
                        alt={cat.name}
                        loading="lazy"
                        decoding="async"
                        width="400"
                        height="300"
                      />
                    ) : (
                      <span
                        className="category-image"
                        role="img"
                        aria-label={cat.name}
                      />
                    )}
                  </span>
                  {/* Footer — name + arrow */}
                  <span className="category-footer">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-arrow" aria-hidden="true">→</span>
                  </span>
                </Link>
              )
            })}
          </Reveal>
        )}
      </div>
    </div>
  )
}
