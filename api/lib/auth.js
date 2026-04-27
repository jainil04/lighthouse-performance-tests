import jwt from 'jsonwebtoken'

/**
 * Reads Authorization: Bearer <token>, verifies it, and returns the decoded payload.
 * Throws an error with a .status property on any failure so callers can forward it
 * directly to res.status(err.status).json({ error: err.message }).
 */
export function verifyToken(req) {
  const auth = req.headers['authorization']
  if (!auth?.startsWith('Bearer ')) {
    const err = new Error('Authorization header missing or malformed')
    err.status = 401
    throw err
  }

  const token = auth.slice(7)
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    const err = new Error('Invalid or expired token')
    err.status = 401
    throw err
  }
}
