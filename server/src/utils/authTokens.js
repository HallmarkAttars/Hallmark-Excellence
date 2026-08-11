const jwt = require('jsonwebtoken')

// Single source of truth for issuing an admin JWT. Used by BOTH login and the
// sliding-session renewal (verify/refresh) so the payload and expiry semantics
// can never drift between the two paths.
//
//   admin: { id, email, name, role }
//
// Returns a 7-day token — the same lifetime as always; renewal only re-stamps
// the window for an ALREADY-valid session, it never weakens expiry.
const TOKEN_TTL = '7d'

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  )
}

module.exports = { signAdminToken, TOKEN_TTL }
