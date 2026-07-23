// One-time script to create the first admin user.
// Edit the values below, then run:  node scripts/createAdmin.js

require('dotenv').config()
const bcrypt = require('bcryptjs')
const supabase = require('../src/config/supabase')

// --- Configuration: override via environment variables or .env -------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Store Admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin321'
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
