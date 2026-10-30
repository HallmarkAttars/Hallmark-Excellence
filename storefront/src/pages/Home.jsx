import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CinematicHero from '../components/home/CinematicHero'
import { buildHomeHeroImages } from '../utils/homeHeroImages'
import Reveal from '../animations/Reveal'
import CategoryGrid from '../components/home/CategoryGrid'
import BrandShowcaseCard from '../components/home/BrandShowcaseCard'
import SkeletonCategoryGrid from '../components/skeleton/SkeletonCategoryGrid'
import SkeletonCollectionBanner from '../components/skeleton/SkeletonCollectionBanner'
import SkeletonProductGrid from '../components/skeleton/SkeletonProductGrid'
import SkeletonSocialStrip from '../components/skeleton/SkeletonSocialStrip'
import { getCategories, getBrands, getFeaturedProducts } from '../services/mockApi'
import { HOME_CATEGORIES, HOME_BRANDS } from '../data/content'
import { sortBrandsByDisplayOrder } from '../utils/brandOrder'
import { useMobileBrandStack } from '../hooks/useMobileBrandStack'
import SEO from '../components/seo/SEO'
import {
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildLocalBusinessSchema,
} from '../utils/seo'

// Below-the-fold, JS-heavy sections are lazy-loaded so their code stays out
// of the initial Home bundle and only mounts when the visitor scrolls close.
const LazyFeaturedProducts = lazy(() => import('../components/home/FeaturedProducts'))
const LazySocialStrip = lazy(() => import('../components/home/SocialStrip'))

// Defers rendering (and mounting) of below-the-fold sections until the
// browser is close to them. No IntersectionObserver → renders immediately,
// so the page never loses content.
function DeferredSection({ placeholder, children, rootMargin = '400px 0px' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          setVisible(true)
        }
      },
      { rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return <div ref={ref}>{visible ? children : placeholder}</div>
}

export default function Home() {
  // Independent loads — each section renders as soon as ITS data arrives,
  // instead of waiting for the slowest / full-catalog fetch. null = loading.
  const [categories, setCategories] = useState(null)
  const [brands, setBrands] = useState(null)
  const [featured, setFeatured] = useState(null)
  const brandsShowcaseRef = useRef(null)

  useMobileBrandStack(brandsShowcaseRef)

  useEffect(() => {
    // Individual loads — a failure just leaves that section hidden (no hang).
    // Catches keep failures quiet instead of unhandled rejections.
    getCategories().then(setCategories).catch(() => setCategories([]))
    getBrands().then(setBrands).catch(() => setBrands([]))
  }, [])

  useEffect(() => {
    // Featured/card-only summary fetch, deferred off the critical paint path
    // so it never competes with the hero for bandwidth on mobile.
    let cancelled = false
    const load = () => {
      if (cancelled) return
      getFeaturedProducts({ limit: 18 })
        .then((list) => { if (!cancelled) setFeatured(list) })
        .catch(() => { if (!cancelled) setFeatured([]) })
    }
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(load, { timeout: 1500 })
      return () => {
        cancelled = true
        if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id)
      }
    }
    const timer = setTimeout(load, 800)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
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

  const featuredProducts = featured ?? []

  // Curated hero: real Arees / Dahab product photography only. Deliberately
  // independent of the database brand rows, whose seeded images are stock
  // photography rather than our bottles. Memoized so Home re-renders never
  // hand CinematicHero a new array identity (which would reset its slides).
  const heroImages = useMemo(() => buildHomeHeroImages(), [])

  const homeSchema = [
    buildOrganizationSchema(),
    buildWebSiteSchema(),
    buildLocalBusinessSchema(),
  ]

  return (
    <div>
      <SEO
        title={DEFAULT_TITLE}
        description={DEFAULT_DESCRIPTION}
        canonical="/"
        schema={homeSchema}
      />
      {/* Hero renders immediately from the curated product photography set. */}
      <CinematicHero images={heroImages} />

      {/* "Shop by Category" heading paints immediately — it is the mobile LCP
          element, so it must never wait on the categories API response or the
          scroll-reveal fade. Only the grid cards themselves are data-gated. */}
      <section className="section category-section">
        <div className="container">
          <div className="category-section-head">
            <div className="category-head-text">
              {HOME_CATEGORIES.eyebrow && (
                <p className="category-eyebrow">{HOME_CATEGORIES.eyebrow}</p>
              )}
              <h2 className="category-title">{HOME_CATEGORIES.title}</h2>
              {HOME_CATEGORIES.subtitle && (
                <p className="category-subtitle">{HOME_CATEGORIES.subtitle}</p>
              )}
            </div>
            <div className="category-head-action">
              <Link to={HOME_CATEGORIES.viewAll.to} className="category-view-all">
                <span className="category-view-all-text">{HOME_CATEGORIES.viewAll.label}</span>
                <span className="category-view-all-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          {categories === null ? (
            <SkeletonCategoryGrid count={6} />
          ) : (
            categories.length > 0 && <CategoryGrid categories={categories} />
          )}
        </div>
      </section>

      {(brands === null || (brands && brands.length > 0)) && (
        brands === null ? (
          <SkeletonCollectionBanner />
        ) : (
          /* Our Brands — the existing Arees / Dahab collection cards moved
              directly below Shop by Category under one heading. The banners are
              the SAME components as before (no duplicates, no new content). */
          <section className="our-brands-section" id="brands">
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
              <div className="brands-showcase" ref={brandsShowcaseRef}>
                {gridCards.map(({ brand, variant }, i) => (
                  <Reveal
                    key={brand.id}
                    delay={(i % 5) * 100}
                    className={`brands-showcase-cell brands-showcase-cell--${variant}`}
                    style={{ '--card-index': i }}
                  >
                    <BrandShowcaseCard brand={brand} variant={variant} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )
      )}

      {/* Featured orbit + social strip: code-split, IO-deferred, idle-fetched */}
      <DeferredSection placeholder={<SkeletonProductGrid count={6} />}>
        <Suspense fallback={<SkeletonProductGrid count={6} />}>
          {featured && featured.length > 0 && (
            <LazyFeaturedProducts
              products={featuredProducts}
              allProducts={featuredProducts}
            />
          )}
        </Suspense>
      </DeferredSection>

      <DeferredSection placeholder={<SkeletonSocialStrip />}>
        <Suspense fallback={<SkeletonSocialStrip />}>
          {featured && featured.length > 0 && <LazySocialStrip products={featuredProducts} />}
        </Suspense>
      </DeferredSection>

    </div>
  )
}
