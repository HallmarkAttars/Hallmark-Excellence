import { describe, expect, it } from 'vitest'
import { moveItem } from './order'

describe('moveItem', () => {
  it('moves an item to the end', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('moves an item to the front', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('moves an item by one position', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('moves downward and shifts the removed gap', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 1, 3)).toEqual(['a', 'c', 'd', 'b'])
  })

  it('clamps a target beyond the end to the end', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a'])
  })

  it('returns null for same index', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toBeNull()
  })

  it('returns null for out-of-range from', () => {
    expect(moveItem(['a', 'b', 'c'], 3, 0)).toBeNull()
    expect(moveItem(['a', 'b', 'c'], -1, 0)).toBeNull()
  })

  it('returns null for empty lists', () => {
    expect(moveItem([], 0, 1)).toBeNull()
  })

  it('never mutates the original array', () => {
    const list = ['a', 'b', 'c']
    moveItem(list, 0, 2)
    expect(list).toEqual(['a', 'b', 'c'])
  })
})
