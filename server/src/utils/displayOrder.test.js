// Manual display-order query helpers — unit tests for
// server/src/utils/displayOrder.js. Covers the ordering rule (display_order
// asc, never alphabetical) and the pre-migration fallback detection.
// No Supabase, no I/O.
//
// Run with:  npm test  (server)

import { describe, expect, it } from 'vitest'
import {
  applyProductOrder,
  applyCategoryOrder,
  isMissingOrderColumnError,
} from './displayOrder'

// Minimal PostgREST-query stand-in that records .order() calls.
function fakeQuery() {
  const calls = []
  return {
    order(col, opts) {
      calls.push([col, opts])
      return this
    },
    calls,
  }
}

describe('applyProductOrder', () => {
  it('orders by display_order ascending then created_at desc', () => {
    const q = fakeQuery()
    applyProductOrder(q, true)
    expect(q.calls).toEqual([
      ['display_order', { ascending: true }],
      ['created_at', { ascending: false }],
    ])
  })

  it('skips display_order when useDisplayOrder is false (pre-migration)', () => {
    const q = fakeQuery()
    applyProductOrder(q, false)
    expect(q.calls).toEqual([['created_at', { ascending: false }]])
  })
})

describe('applyCategoryOrder', () => {
  it('orders by display_order ascending then created_at asc (insertion order)', () => {
    const q = fakeQuery()
    applyCategoryOrder(q)
    expect(q.calls).toEqual([
      ['display_order', { ascending: true }],
      ['created_at', { ascending: true }],
    ])
  })
})

describe('isMissingOrderColumnError', () => {
  it('detects the PostgREST missing-column ordering message', () => {
    const err = { message: '"display_order" is not a valid column in \'products\'' }
    expect(isMissingOrderColumnError(err)).toBe(true)
  })

  it('detects the alternate "column x does not exist" message format', () => {
    const err = { message: 'column categories.display_order does not exist' }
    expect(isMissingOrderColumnError(err)).toBe(true)
  })

  it('returns false for other errors and nullish input', () => {
    expect(isMissingOrderColumnError({ message: 'something else' })).toBe(false)
    expect(isMissingOrderColumnError({ message: 'display_order must be an integer' })).toBe(false)
    expect(isMissingOrderColumnError(null)).toBe(false)
    expect(isMissingOrderColumnError(undefined)).toBe(false)
  })
})
