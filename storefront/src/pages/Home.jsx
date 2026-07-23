import { useEffect, useState } from 'react'
import Hero from '../components/home/Hero'
import CategoryGrid from '../components/home/CategoryGrid'
import BrandBanner from '../components/home/BrandBanner'
import { getCategories, getBrands } from '../services/mockApi'

export default function Home() {
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])

  useEffect(() => {
    getCategories().then(setCategories)
    getBrands().then(setBrands)
  }, [])

  return (
    <div>
      <Hero />
      {categories.length > 0 && <CategoryGrid categories={categories} />}
      {brands.length > 0 && (
        <section className="brand-section">
          <h2 className="brand-section-heading">OUR BRANDS</h2>
          {brands.map((brand) => (
            <BrandBanner key={brand.id} brand={brand} />
          ))}
        </section>
      )}
    </div>
  )
}
