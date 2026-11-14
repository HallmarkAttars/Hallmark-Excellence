import { useEffect, useState } from 'react'
import { PRODUCTS_PER_PAGE } from '../utils/pagination'

// Listings cap mobile pages at 16 cards so phones do less layout work and
// request fewer lazy images. Desktop keeps the established 50-card page.
export const MOBILE_PRODUCTS_PER_PAGE = 16

const MOBILE_QUERY = '(max-width: 767px)'

function currentPageSize() {
  if (typeof window === 'undefined') return PRODUCTS_PER_PAGE
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(MOBILE_QUERY).matches
      ? MOBILE_PRODUCTS_PER_PAGE
      : PRODUCTS_PER_PAGE
  }
  return window.innerWidth < 768 ? MOBILE_PRODUCTS_PER_PAGE : PRODUCTS_PER_PAGE
}

export default function useResponsivePageSize() {
  const [pageSize, setPageSize] = useState(currentPageSize)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const update = () => setPageSize(currentPageSize())
    if (typeof window.matchMedia === 'function') {
      const media = window.matchMedia(MOBILE_QUERY)
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', update)
        return () => media.removeEventListener('change', update)
      }
      if (typeof media.addListener === 'function') {
        media.addListener(update)
        return () => media.removeListener(update)
      }
    }

    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  return pageSize
}
