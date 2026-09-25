import { useEffect, useState } from 'react'
import Reveal from '../animations/Reveal'
import { getBrands } from '../services/mockApi'
import { HOME_BRANDS } from '../data/content'
import { sortBrandsByDisplayOrder } from '../utils/brandOrder'
import BrandShowcaseCard from '../components/home/BrandShowcaseCard'
import SkeletonCollectionBanner from '../components/skeleton/SkeletonCollectionBanner'
import SEO from '../components/seo/SEO'
import { buildBreadcrumbsSchema } from '../utils/seo'
import './Brands.css'

export default function Brands() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBrands()
      .then((b) => {
        setBrands(b)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const orderedBrands = sortBrandsByDisplayOrder(brands)
  const gridCards = orderedBrands.map((brand, i) => ({
    brand,
    variant: i % 5 < 2 ? 'featured' : 'standard',
  }))

  return (
    <div className="brands-page-wrap">
      <SEO
        title="Our Fragrance Brands | Arees Perfumes"
        description="Discover our exclusive collections of authentic luxury attars, perfumes, and oud oils crafted with heritage and excellence."
        canonical="/brands"
        schema={buildBreadcrumbsSchema([
          { name: 'Home', path: '/' },
          { name: 'Brands', path: '/brands' },
        ])}
      />
      <div className="page-heading">
        <p className="eyebrow">OUR COLLECTIONS</p>
        <h1>{HOME_BRANDS.title}</h1>
        <p>{HOME_BRANDS.subtitle}</p>
      </div>

      <div className="container">
        {loading ? (
          <SkeletonCollectionBanner />
        ) : (
          <div className="brands-showcase brands-page-grid">
            {gridCards.map(({ brand, variant }, i) => (
              <Reveal
                key={brand.id}
                delay={(i % 5) * 80}
                className={`brands-showcase-cell brands-showcase-cell--${variant}`}
                style={{ '--card-index': i }}
              >
                <BrandShowcaseCard brand={brand} variant={variant} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
