import { useParams } from 'react-router-dom'
import BrandProductsAdmin from './BrandProductsAdmin'

// One generic route for EVERY brand's product management screen
// (/admin/brands/:slug). Replaces the old per-brand wrapper pages while
// keeping the same URL shape for Arees and Dahab.
export default function BrandProductsPage() {
  const { slug } = useParams()
  return <BrandProductsAdmin brandSlug={slug} />
}
