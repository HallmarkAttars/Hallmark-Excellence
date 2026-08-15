import { useEffect, useState } from 'react'
import Hero from '../components/home/Hero'
import Reveal from '../animations/Reveal'
import CategoryGrid from '../components/home/CategoryGrid'
import BrandShowcaseCard from '../components/home/BrandShowcaseCard'
import FeaturedProducts from '../components/home/FeaturedProducts'
import SocialStrip from '../components/home/SocialStrip'
import SkeletonCategoryGrid from '../components/skeleton/SkeletonCategoryGrid'
import SkeletonCollectionBanner from '../components/skeleton/SkeletonCollectionBanner'
import SkeletonProductGrid from '../components/skeleton/SkeletonProductGrid'
import SkeletonSocialStrip from '../components/skeleton/SkeletonSocialStrip'
import { getCategories, getBrands, getProducts } from '../services/mockApi'
import { HOME_BRANDS } from '../data/content'
import { sortBrandsByDisplayOrder } from '../utils/brandOrder'

export default function Home() {
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [products, setProducts] = useState([])
  // True until ALL three fetches have settled (success OR failure) — a single
  // failing endpoint must not leave the page stuck on skeletons forever.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Individual loads — a failure just leaves that section hidden (no hang).
    // Catches keep failures quiet instead of unhandled rejections.
    Promise.allSettled([
      getCategories().then(setCategories).catch(() => {}),
      getBrands().then(setBrands).catch(() => {}),
      getProducts().then(setProducts).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // Active brands only, sorted by the admin's display position (shared rule
  // with the header dropdown / footer — see utils/brandOrder.js). The cards
  // are laid out in a repeating editorial 2 + 3 rhythm purely by position:
  // the first two brands of every group of five are the large ~50% cards and
  // the next three the ~33% cards, so any number of brands keeps the premium
  // layout (2+3, 2+3, …) instead of falling back to a small-card grid.
  const orderedBrands = sortBrandsByDisplayOrder(brands)
  const gridCards = orderedBrands.map((brand, i) => ({
    brand,
    variant: i % 5 < 2 ? 'featured' : 'standard',
  }))

  // Admin-controlled featured products — uses the same is_featured field the
  // admin panel toggles. No extra API read: it reuses the products already
  // fetched above.
  const featuredProducts = products.filter((p) => p.is_featured === true)

  return (
    <div>
      {/* Hero is static/local content (no fetch dependency) — it always
          renders immediately and is never wrapped in a loading condition.
          Only the data-driven sections below swap to skeletons. */}
      <Hero />

      {loading ? (
        <>
          {/* Below Hero: Shop by Category placeholder (home shows max 6) */}
          <SkeletonCategoryGrid count={6} />
          {/* Our Brands placeholder (two collection cards) */}
          <SkeletonCollectionBanner />
          {/* Featured Products placeholder (home shows max 6) */}
          <SkeletonProductGrid count={6} />
          {/* Follow Our Journey placeholder */}
          <SkeletonSocialStrip />
        </>
      ) : (
        <>
          {categories.length > 0 && <CategoryGrid categories={categories} />}
          {/* Our Brands — the existing Arees / Dahab collection cards moved
              directly below Shop by Category under one heading. The banners are
              the SAME components as before (no duplicates, no new content). */}
          {gridCards.length > 0 && (
            <section className="our-brands-section">
              <div className="container">
                <div className="section-head">
                  <h2 className="section-title-upper">{HOME_BRANDS.title}</h2>
                  {HOME_BRANDS.subtitle && (
                    <p className="section-subtitle">{HOME_BRANDS.subtitle}</p>
                  )}
                </div>

                {/* Editorial grid — two large 50% cards, then three 33% cards,
                    repeating for every group of five brands. The Reveal wrapper
                    is the grid cell (variant controls its column span). */}
                <div className="brands-showcase">
                  {gridCards.map(({ brand, variant }, i) => (
                    <Reveal
                      key={brand.id}
                      delay={(i % 5) * 100}
                      className={`brands-showcase-cell brands-showcase-cell--${variant}`}
                    >
                      <BrandShowcaseCard brand={brand} variant={variant} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>
          )}
          <FeaturedProducts products={featuredProducts} />
          <SocialStrip products={products} />
        </>
      )}

    </div>
  )
}
