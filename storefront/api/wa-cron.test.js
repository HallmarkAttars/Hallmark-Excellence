// Cron endpoint tests — daily sweep over the order-registry, offline.

import { describe, it, expect, beforeEach } from 'vitest'
import { sweepAll, sweepSession } from './wa-cron.js'
import * as store from './wa/_store.js'

let calls

function stubIo(track) {
  return {
    getShopCategories: async () => [],
    categoryProducts: async () => [],
    postOrder: async () => {
      return { order: { order_number: 'X' } }
    },
    trackOrder: async ({ type, value }) => {
      calls.push({ type, value })
      return track
    },
    getQrImage: async () => null,
  }
}

const SNAP = { '5001': { order_status: 'Processing', payment_status: 'Unpaid', total: 250 } }
const CHANGED = [{ order_number: '5001', order_status: 'Shipped', total: 250, payment_status: 'Paid' }]

describe('wa cron — silent-thread status sweep', () => {
  beforeEach(() => {
    store.resetMemoryForTests()
    delete process.env.WA_CRON_SECRET
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    calls = []
  })

  it('notifies a registered session when payment/status moved on', async () => {
    await store.saveSession('s1', { v: 1, state: 'done', phone: '+919840750467', cart: [], statusSnap: SNAP })
    await store.registryAdd('s1')
    const out = []
    const r = await sweepSession('s1', { io: stubIo(CHANGED), sendFn: async (m) => out.push(m) })
    expect(out).toHaveLength(1)
    expect(out[0].body.text.body).toContain('0')
    expect(out[0].body.text.body).toContain('*Order update for you*')
    expect(r.notified).toBe(true)
    expect(r.pruned).toBe(false)
  })

  it('no change → nothing sent, session stays registered', async () => {
    await store.saveSession('s1', { v: 1, state: 'done', phone: '+919840750467', cart: [], statusSnap: SNAP })
    await store.registryAdd('s1')
    const out = []
    const r = await sweepSession('s1', { io: stubIo([{ order_number: '5001', order_status: 'Processing', total: 250, payment_status: 'Unpaid' }]), sendFn: async (m) => out.push(m) })
    expect(out).toHaveLength(0)
    expect(r.notified).toBe(false)
  })

  it('sweepAll without KV answers disabled (lazy-only mode)', async () => {
    const r = await sweepAll()
    expect(r.enabled).toBe(false)
  })

  it('sweepAll walks the registry and prunes dead sessions', async () => {
    // Fake KV env so kvConfigured() is true; KV fetch fails → memory fallback.
    process.env.KV_REST_API_URL = 'https://kv.invalid.example'
    process.env.KV_REST_API_TOKEN = 'x'
    await store.saveSession('s1', { v: 1, state: 'done', phone: '+919840750467', cart: [], statusSnap: SNAP })
    await store.registryAdd('s1')
    await store.registryAdd('s-gone')
    const r = await sweepAll({ io: stubIo(CHANGED) })
    expect(r.enabled).toBe(true)
    expect(r.swept).toBe(2)
    expect(r.notified).toBe(1)
    expect(await store.registryList()).toEqual(['s1'])
  })
})
