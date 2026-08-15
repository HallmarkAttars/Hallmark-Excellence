// ============================================================================
// ENV-CONFIGURED MASTER ADMIN
// ----------------------------------------------------------------------------
// The admin panel's master login comes from server-side environment
// variables (server/.env.local): ADMIN_USERNAME / ADMIN_PASSWORD. These
// exist ONLY in the server process — never in client code, never in the
// bundle, never in API responses.
//
// The env admin has no row in the users table, so it is issued a stable
// sentinel UUID identity that requireAuth() recognises and authorizes
// directly as role 'admin' (the full permission matrix in roles.js).
// ============================================================================

const ENV_ADMIN_ID = '00000000-0000-4000-8000-000000000001'

// { username, password, configured } — username is trimmed + lowercased so
// login matching and token verification stay case-insensitive on the domain.
function getEnvAdminConfig() {
  const username = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ''
  return {
    username,
    password,
    configured: Boolean(username && password),
  }
}

module.exports = { ENV_ADMIN_ID, getEnvAdminConfig }
