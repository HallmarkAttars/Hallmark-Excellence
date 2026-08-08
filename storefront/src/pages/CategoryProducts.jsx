import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import { getCategoryBySlug, getProductsByCategory } from '../services/mockApi'

export default function CategoryProducts() {
  const { slug } = useParams()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getCategoryBySlug(slug), getProductsByCategory(slug)])
      .then(([cat, prods]) => {
        setCategory(cat)
        setProducts(prods)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load products.')
        setLoading(false)
      })
  }, [slug, reloadKey])

  return (
    <div>
      <div className="page-heading">
        <Link to="/categories" className="eyebrow">&larr; All Categories</Link>
        <h1>{category ? category.name : 'Category'}</h1>
      </div>
      <div className="container" style={{ paddingBottom: 80 }}>
        <ProductGrid
          products={products}
          loading={loading}
          error={error}
          onRetry={() => setReloadKey((k) => k + 1)}
          emptyMessage="No products in this category yet."
        />
      </div>
    </div>
  )
}
