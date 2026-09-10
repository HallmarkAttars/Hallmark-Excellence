import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCategories,
  getBrands,
  createCategory,
  updateCategory,
  deleteCategory,
  updateBrandDetails,
  updateBrandBulkPricing,
  invalidateCategoriesCache,
  invalidateBrandsCache,
} from './mockApi'
import { adminApi } from './api'

describe('Admin API Caching & Request Coalescing', () => {
  beforeEach(() => {
    invalidateCategoriesCache()
    invalidateBrandsCache()
    vi.restoreAllMocks()
  })

  it('coalesces identical simultaneous GET requests into a single network call', async () => {
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount += 1
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 10))
      return {
        ok: true,
        text: async () => JSON.stringify({ categories: [{ id: '1', name: 'Attar' }] }),
      }
    })

    // Launch two simultaneous get calls to the exact same path
    const [res1, res2] = await Promise.all([
      adminApi.get('/api/admin/categories', 'token123'),
      adminApi.get('/api/admin/categories', 'token123'),
    ])

    expect(callCount).toBe(1)
    expect(res1).toEqual({ categories: [{ id: '1', name: 'Attar' }] })
    expect(res2).toEqual({ categories: [{ id: '1', name: 'Attar' }] })
  })

  it('caches categories in-memory across sequential calls and invalidates on mutations', async () => {
    let fetchCount = 0
    vi.spyOn(adminApi, 'get').mockImplementation(async (path) => {
      if (path === '/api/admin/categories') {
        fetchCount += 1
        return { categories: [{ id: 'cat1', name: 'Attar' }] }
      }
      return {}
    })
    vi.spyOn(adminApi, 'post').mockResolvedValue({ category: { id: 'cat2', name: 'Oud' } })
    vi.spyOn(adminApi, 'patch').mockResolvedValue({ category: { id: 'cat1', name: 'Attar Updated' } })
    vi.spyOn(adminApi, 'del').mockResolvedValue({ success: true })

    // Call 1: fetches from network
    const cats1 = await getCategories()
    expect(fetchCount).toBe(1)
    expect(cats1).toHaveLength(1)

    // Call 2: served from in-memory cache (0 additional network fetches)
    const cats2 = await getCategories()
    expect(fetchCount).toBe(1)
    expect(cats2).toEqual(cats1)

    // Mutation: createCategory -> invalidates cache
    await createCategory({ name: 'Oud' })

    // Call 3: should refetch from network after invalidation
    await getCategories()
    expect(fetchCount).toBe(2)

    // Mutation: updateCategory -> invalidates cache
    await updateCategory('cat1', { name: 'Attar Updated' })
    await getCategories()
    expect(fetchCount).toBe(3)

    // Mutation: deleteCategory -> invalidates cache
    await deleteCategory('cat2')
    await getCategories()
    expect(fetchCount).toBe(4)
  })

  it('caches brands in-memory across sequential calls and invalidates on mutations', async () => {
    let fetchCount = 0
    vi.spyOn(adminApi, 'get').mockImplementation(async (path) => {
      if (path === '/api/admin/brands') {
        fetchCount += 1
        return { brands: [{ id: 'b1', name: 'Arees', slug: 'arees' }] }
      }
      return {}
    })
    vi.spyOn(adminApi, 'put').mockResolvedValue({ brand: { id: 'b1', name: 'Arees' } })
    vi.spyOn(adminApi, 'patch').mockResolvedValue({ brand: { id: 'b1', bulk_enabled: true } })

    // Call 1: fetches from network
    const brands1 = await getBrands()
    expect(fetchCount).toBe(1)
    expect(brands1).toHaveLength(1)

    // Call 2: served from cache
    const brands2 = await getBrands()
    expect(fetchCount).toBe(1)
    expect(brands2).toEqual(brands1)

    // Mutation: updateBrandDetails -> invalidates cache
    await updateBrandDetails('b1', { description: 'Updated' })

    // Call 3: refetches
    await getBrands()
    expect(fetchCount).toBe(2)

    // Mutation: updateBrandBulkPricing -> invalidates cache
    await updateBrandBulkPricing('b1', { bulk_enabled: true })
    await getBrands()
    expect(fetchCount).toBe(3)
  })
})
