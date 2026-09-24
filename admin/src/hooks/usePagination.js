import { useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const ALLOWED_SIZES = [25, 50, 100]

export function usePagination({
  items = [],
  defaultPageSize = 25,
  syncUrl = true,
  resetTrigger, // optional dependency (like search or filter) that auto-resets page to 1
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read initial/current page & limit from URL query params (or fallback to defaults)
  const urlPage = parseInt(searchParams.get('page'), 10)
  const urlLimit = parseInt(searchParams.get('limit'), 10)

  const rawPage = Number.isInteger(urlPage) && urlPage > 0 ? urlPage : 1
  const pageSize = ALLOWED_SIZES.includes(urlLimit) ? urlLimit : defaultPageSize

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Clamp current page to totalPages
  const currentPage = Math.min(rawPage, totalPages)

  // Sync back to URL if rawPage was out of bounds (e.g., after deletion or list shrinking)
  useEffect(() => {
    if (syncUrl && rawPage > totalPages && totalPages > 0) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('page', String(totalPages))
          return next
        },
        { replace: true }
      )
    }
  }, [syncUrl, rawPage, totalPages, setSearchParams])

  // Automatically reset to page 1 when resetTrigger (search or filter) changes
  useEffect(() => {
    if (resetTrigger !== undefined && currentPage !== 1) {
      if (syncUrl) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('page', '1')
            return next
          },
          { replace: true }
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger])

  const onPageChange = useCallback(
    (page) => {
      const target = Math.max(1, Math.min(page, totalPages))
      if (syncUrl) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('page', String(target))
            return next
          },
          { replace: false }
        )
      }
    },
    [syncUrl, totalPages, setSearchParams]
  )

  const onPageSizeChange = useCallback(
    (size) => {
      const validSize = ALLOWED_SIZES.includes(size) ? size : 25
      if (syncUrl) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('limit', String(validSize))
            next.set('page', '1') // reset to page 1 on page size change
            return next
          },
          { replace: false }
        )
      }
    },
    [syncUrl, setSearchParams]
  )

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    paginatedItems,
    onPageChange,
    onPageSizeChange,
  }
}
