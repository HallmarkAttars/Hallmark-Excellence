// Manual display-order helper shared by the admin reorder UIs.
//
// The order is ALWAYS a 0-based array index internally; the UI renders
// index + 1 as the human-facing "Position". The persisted display_order
// column is 1-based (first item = 1).

// Moves the item at `from` to `to` (clamped to valid bounds), returning a
// NEW array. Returns null when the move is a no-op (same index, out of
// range, or empty list) so callers can skip state updates cheaply.
// Never mutates the input array.
export function moveItem(list, from, to) {
  if (!Array.isArray(list) || list.length === 0) return null
  if (from === to) return null
  if (from < 0 || from >= list.length) return null

  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item)
  return next
}
