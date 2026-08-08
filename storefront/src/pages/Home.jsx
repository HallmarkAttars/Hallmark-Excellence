import { useEffect, useState } from 'react'
import Hero from '../components/home/Hero'
import Reveal from '../animations/Reveal'
import CategoryGrid from '../components/home/CategoryGrid'
import CollectionBanner from '../components/home/CollectionBanner'
import FeaturedProducts from '../components/home/FeaturedProducts'
import WhyChooseUs from '../components/home/WhyChooseUs'
import SocialStrip from '../components/home/SocialStrip'
import { getCategories, getBrands, getProducts } from '../services/mockApi'
import { HOME_BRANDS } from '../data/content'

const BRAND_ORDER = ['arees', 'dahab']

export default function Home() {
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    // Individual loads — a failure just leaves that section hidden (no hang).
    // Catches keep failures quiet instead of unhandled rejections.
    getCategories().then(setCategories).catch(() => {})
    getBrands().then(setBrands).catch(() => {})
    getProducts().then(setProducts).catch(() => {})
  }, [])

  // Arees first, then Dahab — regardless of API ordering.
  const orderedBrands = BRAND_ORDER
    .map((slug) => brands.find((b) => b.slug === slug))
    .filter(Boolean)

  // Admin-controlled featured products — uses the same is_featured field the
  // admin panel toggles. No extra API read: it reuses the products already
  // fetched above.
  const featuredProducts = products.filter((p) => p.is_featured === true)

  return (
    <div>
      <Hero />
      {categories.length > 0 && <CategoryGrid categories={categories} />}
      {/* Our Brands — the existing Arees / Dahab collection cards moved
          directly below Shop by Category under one heading. The banners are
          the SAME components as before (no duplicates, no new content). */}
      {orderedBrands.length > 0 && (
        <section className="our-brands-section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title-upper">{HOME_BRANDS.title}</h2>
            </div>
            <div className="collections-section">
              {orderedBrands.map((brand, i) => (
                <Reveal key={brand.id} delay={i * 120}>
                  <CollectionBanner brand={brand} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
      <FeaturedProducts products={featuredProducts} />
      <SocialStrip products={products} />
      {/* Why Choose Us closes the page — immediately before the footer */}
      <WhyChooseUs />
    </div>
  )
}
