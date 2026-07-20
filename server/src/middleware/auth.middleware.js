const jwt = require('jsonwebtoken')

// Protects admin routes. Expects "Authorization: Bearer <token>".
// On success, attaches the decoded JWT payload to req.admin.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.admin = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

module.exports = { requireAuth }
