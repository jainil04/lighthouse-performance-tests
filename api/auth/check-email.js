import { sql } from '../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.query
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email query parameter required' })
  }

  try {
    const rows = await sql`SELECT 1 FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`
    return res.status(200).json({ exists: rows.length > 0 })
  } catch (err) {
    console.error('[check-email]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
