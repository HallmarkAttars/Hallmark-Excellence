// One-time script to create the first admin user.
// Edit the values below, then run:  node scripts/createAdmin.js

require('dotenv').config()
require('dotenv').config({ path: '.env.local', override: true })
const bcrypt = require('bcryptjs')
const supabase = require('../src/config/supabase')
const { getEnvAdminConfig } = require('../src/config/envAdmin')

// --- Configuration: credentials come ONLY from server-side env -------------
// ADMIN_USERNAME / ADMIN_PASSWORD live in server/.env.local (gitignored).
// There is NO hardcoded fallback — running without them is an explicit
// error, so a credential can never silently default to something committed
// in the repository.
const envAdmin = getEnvAdminConfig()
if (!envAdmin.configured) {
  console.error(
    'ADMIN_USERNAME and ADMIN_PASSWORD must be set in server/.env.local to create the admin.'
  )
  process.exit(1)
}
const ADMIN_EMAIL = envAdmin.username
const ADMIN_PASSWORD = envAdmin.password
const ADMIN_NAME = process.env.ADMIN_NAME || 'Store Admin'
// ---------------------------------------------------------------------------

async function createAdmin() {
  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

    const { data: existing, error: findError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .maybeSingle()

    if (findError) {
      console.error('Error checking for existing admin:', findError.message)
      process.exit(1)
    }

    if (existing) {
      console.log(`An admin with email "${ADMIN_EMAIL}" already exists. Nothing to do.`)
      process.exit(0)
    }

    const { error } = await supabase.from('admin_users').insert({
      email: ADMIN_EMAIL,
      password_hash: passwordHash,
      name: ADMIN_NAME,
    })

    if (error) {
      console.error('Error creating admin:', error.message)
      process.exit(1)
    }

    console.log('Admin created successfully')
    process.exit(0)
  } catch (err) {
    console.error('Unexpected error creating admin:', err)
    process.exit(1)
  }
}

createAdmin()
