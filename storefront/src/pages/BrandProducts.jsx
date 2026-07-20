import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import { getBrandBySlug, getProductsByBrand } from '../services/mockApi'
import './BrandProducts.css'

export default function BrandProducts() {
  const { slug } = useParams()
  const [brand, setBrand] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getBrandBySlug(slug), getProductsByBrand(slug)]).then(
      ([b, prods]) => {
        setBrand(b)
        setProducts(prods)
        setLoading(false)
      }
    )
  }, [slug])

  return (
    <div>
      <section className="brand-hero">
        <div className="container">
          <p className="eyebrow">{brand?.tagline}</p>
          <h1>{brand ? brand.name : 'Brand'}</h1>
        </div>
      </section>
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <ProductGrid
          products={products}
          loading={loading}
          emptyMessage="No products from this brand yet."
        />
      </div>
    </div>
  )
}
