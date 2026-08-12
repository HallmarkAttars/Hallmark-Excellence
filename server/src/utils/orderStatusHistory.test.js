// Order status-history timestamps — unit tests for
// server/src/utils/orderStatusHistory.js (the pure helpers the orders
// controller uses to record per-status transition times and the tracking
// endpoints use to read them back). No Supabase, no I/O.
//
// Run with:  npm test  (server)

import { describe, expect, it } from 'vitest'
import {
  STATUS_HISTORY_KEY,
  STATUS_HISTORY_LABELS,
  parseOrderNotes,
  stringifyOrderNotes,
  recordStatusTimestamp,
} from './orderStatusHistory.js'

describe('STATUS_HISTORY_LABELS', () => {
  it('maps every stored status to the customer-facing timeline label', () => {
    expect(STATUS_HISTORY_LABELS.processing).toBe('Processing')
    expect(STATUS_HISTORY_LABELS.shipped).toBe('Shipped')
    expect(STATUS_HISTORY_LABELS.delivered).toBe('Delivered')
    expect(STATUS_HISTORY_LABELS.cancelled).toBe('Cancelled')
    expect(STATUS_HISTORY_LABELS.returned).toBe('Returned')
  })

  it('does NOT map Pending — the "Order Placed" step always uses created_at', () => {
    expect(STATUS_HISTORY_LABELS.pending).toBeUndefined()
  })
})

describe('parseOrderNotes', () => {
  it('returns the object as-is for properly-encoded jsonb rows', () => {
    const notes = { customer_name: 'A' }
    expect(parseOrderNotes({ notes })).toEqual(notes)
  })

  it('parses a single-encoded JSON string (the shape createOrder writes)', () => {
    const notes = { customer_name: 'A' }
    expect(parseOrderNotes({ notes: JSON.stringify(notes) })).toEqual(notes)
  })

  it('parses a double-encoded JSON string (legacy rows)', () => {
    const notes = { customer_name: 'A' }
    const double = JSON.stringify(JSON.stringify(notes))
    expect(parseOrderNotes({ notes: double })).toEqual(notes)
  })

  it('returns {} for missing, null or malformed notes', () => {
    expect(parseOrderNotes({})).toEqual({})
    expect(parseOrderNotes(null)).toEqual({})
    expect(parseOrderNotes({ notes: '{not json' })).toEqual({})
  })
})

describe('stringifyOrderNotes', () => {
  it('serializes back to the single-encoded string shape createOrder writes', () => {
    const notes = { customer_name: 'A' }
    expect(stringifyOrderNotes(notes)).toBe(JSON.stringify(notes))
  })
})

describe('recordStatusTimestamp', () => {
  const now = new Date('2026-08-13T11:30:00.000Z')

  it('records the first transition for a status and preserves other fields', () => {
    const out = recordStatusTimestamp({ customer_name: 'A' }, 'Processing', now)
    expect(out.customer_name).toBe('A')
    expect(out[STATUS_HISTORY_KEY]).toEqual({ Processing: now.toISOString() })
  })

  it('never records Pending — created_at stays the source of truth for "Order Placed"', () => {
    expect(recordStatusTimestamp({}, 'Pending', now)).toEqual({})
    const notes = { [STATUS_HISTORY_KEY]: { Processing: now.toISOString() } }
    expect(recordStatusTimestamp(notes, 'Pending', now)[STATUS_HISTORY_KEY]).toEqual({
      Processing: now.toISOString(),
    })
  })

  it('accumulates steps across transitions without touching earlier ones', () => {
    let notes = recordStatusTimestamp({}, 'Processing', new Date('2026-08-13T11:30:00Z'))
    notes = recordStatusTimestamp(notes, 'Shipped', new Date('2026-08-14T09:00:00Z'))
    notes = recordStatusTimestamp(notes, 'Delivered', new Date('2026-08-15T16:45:00Z'))
    expect(notes[STATUS_HISTORY_KEY]).toEqual({
      Processing: '2026-08-13T11:30:00.000Z',
      Shipped: '2026-08-14T09:00:00.000Z',
      Delivered: '2026-08-15T16:45:00.000Z',
    })
  })

  it('never overwrites an existing timestamp (first write wins)', () => {
    const first = new Date('2026-08-13T11:30:00Z')
    const later = new Date('2026-08-20T09:00:00Z')
    const notes = recordStatusTimestamp({}, 'Shipped', first)
    expect(recordStatusTimestamp(notes, 'Shipped', later)[STATUS_HISTORY_KEY]).toEqual({
      Shipped: first.toISOString(),
    })
  })

  it('is case-insensitive on the incoming status', () => {
    expect(recordStatusTimestamp({}, 'processing', now)[STATUS_HISTORY_KEY]).toEqual({
      Processing: now.toISOString(),
    })
    expect(recordStatusTimestamp({}, 'SHIPPED', now)[STATUS_HISTORY_KEY]).toEqual({
      Shipped: now.toISOString(),
    })
  })

  it('ignores unknown or empty statuses', () => {
    expect(recordStatusTimestamp({}, 'Unknown', now)).toEqual({})
    expect(recordStatusTimestamp({}, '', now)).toEqual({})
  })

  it('creates the history from scratch when the order has no notes yet', () => {
    expect(recordStatusTimestamp(null, 'Shipped', now)).toEqual({
      [STATUS_HISTORY_KEY]: { Shipped: now.toISOString() },
    })
  })

  it('merges into a pre-existing status_history', () => {
    const notes = { [STATUS_HISTORY_KEY]: { Processing: '2026-08-13T11:30:00.000Z' } }
    const out = recordStatusTimestamp(notes, 'Delivered', now)
    expect(out[STATUS_HISTORY_KEY]).toEqual({
      Processing: '2026-08-13T11:30:00.000Z',
      Delivered: now.toISOString(),
    })
  })

  it('does not mutate the input notes object', () => {
    const notes = { customer_name: 'A' }
    recordStatusTimestamp(notes, 'Shipped', now)
    expect(notes[STATUS_HISTORY_KEY]).toBeUndefined()
  })

  it('round-trips through parse + stringify without losing the history', () => {
    const notes = recordStatusTimestamp({ customer_name: 'A' }, 'Processing', now)
    const stored = stringifyOrderNotes(notes)
    expect(parseOrderNotes({ notes: stored })).toEqual(notes)
  })
})
