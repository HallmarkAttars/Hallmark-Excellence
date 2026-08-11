// Manual display-order helpers shared by the products / categories endpoints.
//
// The ordering rule is ALWAYS the same and NEVER alphabetical:
//   - categories: display_order asc (admin-controlled), then created_at ASC
//     (insertion order) so unpositioned items keep a stable order.
//   - products:   display_order asc (admin-controlled), then created_at DESC
//     (newest first) as a tiebreak.
//
// The products.display_order column is added by
// migration_add_display_order.sql. Until it is applied, PostgREST rejects an
// ORDER BY on the missing column — callers use isMissingOrderColumnError to
// fall back to the old ordering so the API never breaks mid-deploy.

// Appends the product ordering rule to a query. Pass useDisplayOrder=false
// when the display_order column does not exist yet (pre-migration).
function applyProductOrder(q, useDisplayOrder = true) {
  let query = q
  if (useDisplayOrder) query = query.order('display_order', { ascending: true })
  return query.order('created_at', { ascending: false })
}

// Appends the category ordering rule (display_order always exists on the
// categories table, so no fallback is needed).
function applyCategoryOrder(q) {
  return q.order('display_order', { ascending: true }).order('created_at', { ascending: true })
}

// PostgREST reports a missing ordering column with different messages across
// versions — "'x' is not a valid column in 'products'" and "column x does
// not exist". This detects BOTH so callers can retry without the
// display_order ordering before the migration is applied.
function isMissingOrderColumnError(error) {
  const msg = error && error.message ? error.message : ''
  return (
    /display_order/i.test(msg) &&
    /does not exist|is not a valid column|could not find/i.test(msg)
  )
}

module.exports = { applyProductOrder, applyCategoryOrder, isMissingOrderColumnError }
