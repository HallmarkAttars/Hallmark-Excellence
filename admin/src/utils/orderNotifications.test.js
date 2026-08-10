import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  loadState,
  saveState,
  initState,
  detectNewOrders,
  markAllRead,
  markRead,
  notificationsFor,
  timeAgo,
} from './orderNotifications'

// Minimal in-memory Storage shim so tests never touch window.localStorage.
function makeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

describe('orderNotifications', () => {
  let storage
  beforeEach(() => {
    storage = makeStorage()
  })

  it('initState seeds existing orders as seen so old orders never notify', () => {
    const s = initState([
      { id: 'a', order_number: 'ORD-1' },
      { id: 'b', order_number: 'ORD-2' },
    ])
    expect(s.seen.a).toBeTruthy()
    expect(s.seen.b).toBeTruthy()
    expect(s.unread).toEqual([])
  })

  it('detectNewOrders flags only unseen orders and never duplicates', () => {
    const s = initState([{ id: 'a' }])
    const r1 = detectNewOrders(
      [{ id: 'a' }, { id: 'b', order_number: 'ORD-B', customer_name: 'N', total_amount: 100 }],
      s
    )
    expect(r1.changed).toBe(true)
    expect(r1.state.unread).toEqual(['b'])
    expect(r1.state.history.b.order_number).toBe('ORD-B')
    expect(r1.state.history.b.total).toBe(100)

    const r2 = detectNewOrders([{ id: 'a' }, { id: 'b' }, { id: 'c' }], r1.state)
    expect(r2.state.unread).toEqual(['b', 'c'])

    // Same orders again → no change, no duplicates.
    const r3 = detectNewOrders([{ id: 'a' }, { id: 'b' }, { id: 'c' }], r2.state)
    expect(r3.changed).toBe(false)
    expect(r3.state.unread).toEqual(['b', 'c'])
  })

  it('markAllRead clears the badge but keeps history (orders untouched)', () => {
    let s = initState([])
    s = detectNewOrders([{ id: 'a', order_number: 'ORD-A' }], s).state
    s = detectNewOrders([{ id: 'a' }, { id: 'b', order_number: 'ORD-B' }], s).state
    expect(s.unread).toEqual(['a', 'b'])

    const cleared = markAllRead(s)
    expect(cleared.unread).toEqual([])
    expect(cleared.history.a).toBeTruthy()
    expect(cleared.history.b).toBeTruthy()
  })

  it('markRead removes a single order from unread', () => {
    let s = initState([])
    s = detectNewOrders([{ id: 'a' }, { id: 'b' }], s).state
    const next = markRead(s, 'a')
    expect(next.unread).toEqual(['b'])
    expect(markRead(s, 'missing').unread).toEqual(['a', 'b'])
  })

  it('notificationsFor returns newest-first unread entries', () => {
    let s = initState([])
    s = detectNewOrders(
      [
        { id: 'old', created_at: '2026-08-01T10:00:00Z' },
        { id: 'new', created_at: '2026-08-02T10:00:00Z' },
      ],
      s
    ).state
    expect(notificationsFor(s).map((n) => n.id)).toEqual(['new', 'old'])
  })

  it('persists and reloads state through storage', () => {
    let s = initState([{ id: 'a' }])
    s = detectNewOrders(
      [{ id: 'a' }, { id: 'b', order_number: 'ORD-B', customer_name: 'N', total: 100, created_at: '2026-08-02T10:00:00Z' }],
      s
    ).state
    saveState(s, storage)

    const loaded = loadState(storage)
    expect(loaded.unread).toEqual(['b'])
    expect(loaded.history.b.order_number).toBe('ORD-B')
    expect(loaded.seen.a).toBeTruthy()

    // Fresh storage with nothing written → null.
    expect(loadState(makeStorage())).toBeNull()
    // Corrupt payload → null (never throws).
    storage.setItem(STORAGE_KEY, '{not json')
    expect(loadState(storage)).toBeNull()
  })

  it('timeAgo formats relative labels', () => {
    const now = Date.parse('2026-08-11T12:00:00Z')
    expect(timeAgo('2026-08-11T11:59:50Z', now)).toBe('Just now')
    expect(timeAgo('2026-08-11T11:58:00Z', now)).toBe('2 minutes ago')
    expect(timeAgo('2026-08-11T10:00:00Z', now)).toBe('2 hours ago')
    expect(timeAgo('2026-08-09T12:00:00Z', now)).toBe('2 days ago')
    expect(timeAgo('')).toBe('')
    expect(timeAgo('garbage')).toBe('')
  })
})
