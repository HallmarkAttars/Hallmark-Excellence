const { createClient } = require('@supabase/supabase-js')

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment. Check your .env file against .env.example.'
  )
}

// This client uses the SERVICE ROLE key and therefore bypasses Row Level
// Security entirely. It must only ever be imported by server-side code —
// never bundled into, or exposed to, any frontend.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

module.exports = supabase
