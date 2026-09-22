import { useLocation } from 'react-router-dom'
import { CANONICAL_ORIGIN } from '../../utils/seo'

// Fallback canonical link component kept for backward compatibility with root layout.
export default function CanonicalLink() {
  const { pathname } = useLocation()
  const href = `${CANONICAL_ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`
  return <link rel="canonical" href={href} data-fallback="true" />
}
