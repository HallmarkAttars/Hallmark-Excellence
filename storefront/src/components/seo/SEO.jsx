import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CANONICAL_ORIGIN,
  DEFAULT_BRAND,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
} from '../../utils/seo'

function setOrCreateMeta(attrName, attrValue, content) {
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    el.setAttribute('data-seo', 'true')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content || '')
}

function setOrCreateLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    el.setAttribute('data-seo', 'true')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setOrCreateJsonLd(schema) {
  const existing = document.head.querySelectorAll('script[type="application/ld+json"][data-seo="true"]')
  existing.forEach((node) => node.remove())

  if (!schema) return

  const schemas = Array.isArray(schema) ? schema.filter(Boolean) : [schema]
  if (schemas.length === 0) return

  schemas.forEach((item, index) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-seo', 'true')
    script.setAttribute('data-index', String(index))
    script.textContent = JSON.stringify(item)
    document.head.appendChild(script)
  })
}

/**
 * Reusable SEO component for managing document head metadata:
 * - Dynamic page titles
 * - Meta descriptions (unique per indexable page)
 * - Canonical URLs (strips query parameters / tracking IDs)
 * - Robots indexing directives ('index,follow' vs 'noindex,nofollow')
 * - Open Graph & Twitter Cards
 * - JSON-LD Structured Data
 */
export default function SEO({
  title,
  description,
  canonical,
  robots = 'index,follow',
  image,
  type = 'website',
  schema,
  jsonLd,
}) {
  const { pathname } = useLocation()

  useEffect(() => {
    // 1. Page Title
    const finalTitle = title || DEFAULT_TITLE
    document.title = finalTitle

    // 2. Meta Description
    const finalDesc = description || DEFAULT_DESCRIPTION
    setOrCreateMeta('name', 'description', finalDesc)

    // 3. Robots Directives
    setOrCreateMeta('name', 'robots', robots)

    // 4. Canonical URL (always apex, strips query strings)
    const canonicalPath = canonical != null ? canonical : pathname
    let cleanCanonical = canonicalPath.startsWith('http')
      ? canonicalPath.split('?')[0].split('#')[0]
      : `${CANONICAL_ORIGIN}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`.split('?')[0].split('#')[0]
    
    // Normalize root path trailing slash consistency
    if (cleanCanonical.endsWith('/') && cleanCanonical !== `${CANONICAL_ORIGIN}/`) {
      cleanCanonical = cleanCanonical.slice(0, -1)
    }
    setOrCreateLink('canonical', cleanCanonical)

    // 5. Open Graph Tags
    const ogImg = image || DEFAULT_OG_IMAGE
    setOrCreateMeta('property', 'og:site_name', DEFAULT_BRAND)
    setOrCreateMeta('property', 'og:type', type)
    setOrCreateMeta('property', 'og:title', finalTitle)
    setOrCreateMeta('property', 'og:description', finalDesc)
    setOrCreateMeta('property', 'og:url', cleanCanonical)
    setOrCreateMeta('property', 'og:image', ogImg)

    // 6. Twitter Card Tags
    setOrCreateMeta('name', 'twitter:card', 'summary_large_image')
    setOrCreateMeta('name', 'twitter:title', finalTitle)
    setOrCreateMeta('name', 'twitter:description', finalDesc)
    setOrCreateMeta('name', 'twitter:image', ogImg)

    // 7. Schema.org JSON-LD
    const effectiveSchema = schema || jsonLd
    setOrCreateJsonLd(effectiveSchema)
  }, [title, description, canonical, pathname, robots, image, type, schema, jsonLd])

  return null
}
