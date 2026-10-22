import { Link } from 'react-router-dom'
import SEO from '../components/seo/SEO'

export default function NotFound() {
  return (
    <section className="page-heading" aria-labelledby="not-found-title">
      <SEO
        title="Page Not Found | Arees Perfumes"
        description="This page could not be found. Browse Arees Perfumes attars, fragrance oils and collections."
        robots="noindex,follow"
      />
      <h1 id="not-found-title">Page not found</h1>
      <p>The page may have moved or the address may be incorrect.</p>
      <Link className="btn btn-primary" to="/shop">Browse attars and perfumes</Link>
    </section>
  )
}
