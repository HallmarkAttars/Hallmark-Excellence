import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import Reveal from '../components/ui/Reveal'
import { getCategoryBySlug, getProductsByCategory } from '../services/mockApi'

export default function CategoryProducts() {
  const { slug } = useParams()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getCategoryBySlug(slug), getProductsByCategory(slug)]).then(
      ([cat, prods]) => {
        setCategory(cat)
        setProducts(prods)
        setLoading(false)
      }
    )
  }, [slug])

  return (
    <div>
      {/* ─── Page Hero ─── */}
      <section className="brand-hero" style={{ padding: '60px 0 48px' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <Reveal animation="fade-up" duration={600}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              <Link to="/categories" viewTransition style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }}>
                &larr; All Categories
              </Link>
            </p>
          </Reveal>
          <Reveal animation="fade-up" duration={700} delay={100}>
            <h1 style={{ color: 'var(--white)', fontSize: 'clamp(2.2rem, 4vw, 3.2rem)' }}>
              {category ? category.name : 'Category'}
            </h1>
          </Reveal>
        </div>
      </section>

      <Reveal animation="fade-up" duration={700}>
        <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
          <ProductGrid
            products={products}
            loading={loading}
            emptyMessage="No products in this category yet."
          />
        </div>
      </Reveal>
    </div>
  )
}
