import { useEffect, useState } from 'react'
import Hero from '../components/home/Hero'
import CategoryGrid from '../components/home/CategoryGrid'
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
  }, [])

  // Arees first, then Dahab — regardless of API ordering.
  const orderedBrands = BRAND_ORDER
    .map((slug) => brands.find((b) => b.slug === slug))
    .filter(Boolean)

  return (
    <div>
      <Hero />
      {categories.length > 0 && <CategoryGrid categories={categories} />}
      <div className="collections-section">
        {orderedBrands.map((brand) => (
          <CollectionBanner key={brand.id} brand={brand} />
        ))}
      </div>
      <FeaturedProducts products={products} />
      <WhyChooseUs />
      <SocialStrip products={products} />
    </div>
  )
}
