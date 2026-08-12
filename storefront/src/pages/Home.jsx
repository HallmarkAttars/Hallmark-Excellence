import { useEffect, useState } from 'react'
import Hero from '../components/home/Hero'
import Reveal from '../animations/Reveal'
import CategoryGrid from '../components/home/CategoryGrid'
import BrandShowcaseCard from '../components/home/BrandShowcaseCard'
import FeaturedProducts from '../components/home/FeaturedProducts'
import WhyChooseUs from '../components/home/WhyChooseUs'
import SocialStrip from '../components/home/SocialStrip'
import SkeletonCategoryGrid from '../components/skeleton/SkeletonCategoryGrid'
import SkeletonCollectionBanner from '../components/skeleton/SkeletonCollectionBanner'
import SkeletonProductGrid from '../components/skeleton/SkeletonProductGrid'
import SkeletonSocialStrip from '../components/skeleton/SkeletonSocialStrip'
import SlowLoadNotice from '../components/skeleton/SlowLoadNotice'
import useSlowLoadNotice from '../hooks/useSlowLoadNotice'
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

  // Shows the "waking up our servers" notice only after `loading` has stayed
  // true for 4s (i.e. a real cold start), never on a fast load.
  const showSlowNotice = useSlowLoadNotice(loading)

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
  // with the header dropdown / footer — see utils/brandOrder.js). Featured
  // (large cards) come first, the rest render as compact cards below. If no
  // brand has a display_type yet, the first two act as featured so the section
  // keeps its premium look pre-configuration.
  const orderedBrands = sortBrandsByDisplayOrder(brands)
  const featuredBrands = orderedBrands.filter((b) => b.display_type === 'featured')
  const secondaryBrands = orderedBrands.filter((b) => b.display_type !== 'featured')
  const featured =
    featuredBrands.length > 0 ? featuredBrands : orderedBrands.slice(0, 2)
  const secondary =
    featuredBrands.length > 0 ? secondaryBrands : orderedBrands.slice(2)

  // Admin-controlled featured products — uses the same is_featured field the
  // admin panel toggles. No extra API read: it reuses the products already
  // fetched above.
  const featuredProducts = products.filter((p) => p.is_featured === true)

  return (
    <div>
      {/* Hero and WhyChooseUs are static/local content (no fetch dependency) —
          they always render immediately and are never wrapped in a loading
          condition. Only the data-driven sections below swap to skeletons. */}
      <Hero />

      {showSlowNotice && <SlowLoadNotice />}

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
          {orderedBrands.length > 0 && (
            <section className="our-brands-section">
              <div className="container">
                <div className="section-head">
                  <h2 className="section-title-upper">{HOME_BRANDS.title}</h2>
                  {HOME_BRANDS.subtitle && (
                    <p className="section-subtitle">{HOME_BRANDS.subtitle}</p>
                  )}
                </div>

                {/* FEATURED — the first two brands as large full-image cards */}
                <div className="brands-showcase brands-showcase--featured">
                  {featured.map((brand, i) => (
                    <Reveal key={brand.id} delay={i * 120}>
                      <BrandShowcaseCard brand={brand} variant="featured" />
                    </Reveal>
                  ))}
                </div>

                {/* SECONDARY — the remaining brands, three-up on desktop */}
                {secondary.length > 0 && (
                  <div className="brands-showcase brands-showcase--standard">
                    {secondary.map((brand, i) => (
                      <Reveal key={brand.id} delay={i * 100}>
                        <BrandShowcaseCard brand={brand} variant="standard" />
                      </Reveal>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
          <FeaturedProducts products={featuredProducts} />
          <SocialStrip products={products} />
        </>
      )}

      {/* Why Choose Us closes the page — immediately before the footer */}
      <WhyChooseUs />
    </div>
  )
}
