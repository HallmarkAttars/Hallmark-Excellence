import { useEffect, useState } from 'react'
import Hero from '../components/home/Hero'
import Reveal from '../animations/Reveal'
import CategoryGrid from '../components/home/CategoryGrid'
<<<<<<< HEAD
import CollectionBanner from '../components/home/CollectionBanner'
import FeaturedProducts from '../components/home/FeaturedProducts'
import WhyChooseUs from '../components/home/WhyChooseUs'
import SocialStrip from '../components/home/SocialStrip'
import { getCategories, getBrands, getProducts } from '../services/mockApi'

const BRAND_ORDER = ['arees', 'dahab']

export default function Home() {
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    getCategories().then(setCategories)
    getBrands().then(setBrands)
    getProducts().then(setProducts)
=======
import BrandShowcase from '../components/home/BrandShowcase'
import FeaturedProductsSection from '../components/home/FeaturedProductsSection'
import WhyChooseUs from '../components/home/WhyChooseUs'
import { getCategories } from '../services/mockApi'

export default function Home() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    getCategories().then(setCategories)
>>>>>>> ee0909d (fix the tracker)
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
<<<<<<< HEAD
      <div className="collections-section">
        {orderedBrands.map((brand, i) => (
          <Reveal key={brand.id} delay={i * 120}>
            <CollectionBanner brand={brand} />
          </Reveal>
        ))}
      </div>
      <FeaturedProducts products={featuredProducts} />
      <SocialStrip products={products} />
      {/* Why Choose Us closes the page — immediately before the footer */}
=======
      <BrandShowcase />
      <FeaturedProductsSection />
>>>>>>> ee0909d (fix the tracker)
      <WhyChooseUs />
    </div>
  )
}
