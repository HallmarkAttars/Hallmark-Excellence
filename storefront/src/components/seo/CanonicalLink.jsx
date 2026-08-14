import { useLocation } from 'react-router-dom'
import { CANONICAL_ORIGIN } from '../../utils/seo'

// Per-route canonical URL.
//
// The storefront has ONE canonical domain — the apex (https://areesperfumes.in).
// Every route renders a <link rel="canonical"> pointing at its own path on the
// apex host, so search engines never see the www host (or a vercel.app preview
// URL) as canonical. Query strings and hashes are deliberately dropped — the
// canonical page is the bare path.
export default function CanonicalLink() {
  const { pathname } = useLocation()
  const href = `${CANONICAL_ORIGIN}${pathname}`
  return <link rel="canonical" href={href} />
}
