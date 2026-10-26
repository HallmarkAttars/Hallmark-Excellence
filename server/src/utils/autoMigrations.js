// Additive, idempotent schema guards run once at server startup.
//
// The project has historically applied migrations through the `exec_sql`
// RPC (see scripts/apply*Migration.js). Running only additive guards here
// lets a deploy become usable without dashboard access; every step is
// safe to repeat and failures never prevent the API from starting.

const supabase = require('../config/supabase')

const ALTER_EXACT_PIECES = `
alter table products add column if not exists sell_exact_pieces boolean not null default false;
`

function isMissingColumnError(error) {
  return Boolean(error && /does not exist|could not find/i.test(error.message))
}

async function ensureSellExactPiecesColumn() {
  const probe = () =>
    supabase.from('products').select('sell_exact_pieces').limit(1)

  const { error } = await probe()
  if (!error) return

  if (!isMissingColumnError(error)) {
    console.warn(`[auto-migrations] sell_exact_pieces probe failed: ${error.message}`)
    return
  }

  const { error: rpcError } = await supabase.rpc('exec_sql', {
    sql: ALTER_EXACT_PIECES,
  })

  if (rpcError) {
    console.warn(
      `[auto-migrations] sell_exact_pieces still missing; run server/db/migration_add_product_sell_exact_pieces.sql in Supabase: ${rpcError.message}`
    )
    return
  }

  const { error: after } = await probe()
  if (after) {
    console.warn(
      `[auto-migrations] sell_exact_pieces migration ran but column is still missing: ${after.message}`
    )
    return
  }

  console.log('[auto-migrations] sell_exact_pieces column added')
}

async function runAutoMigrations() {
  if (process.env.NODE_ENV === 'test') return
  try {
    await ensureSellExactPiecesColumn()
  } catch (error) {
    console.warn(`[auto-migrations] skipped: ${error.message}`)
  }
}

module.exports = { runAutoMigrations }
