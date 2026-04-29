import { verifyToken } from './lib/auth.js';
import { sql } from './lib/db.js';

const ALLOWED_METRICS = new Set([
  'performance', 'accessibility', 'best_practices', 'seo',
  'fcp', 'lcp', 'cls', 'tbt', 'si', 'tti',
]);

const UUID_RE = /\/api\/alerts\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function parseAlertId(req) {
  // Matches /api/alerts/<uuid> — path param routed here by vercel.json
  const match = req.url.match(UUID_RE);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  let userId;
  try {
    ({ userId } = verifyToken(req));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  // GET /api/alerts[?target_id=...]
  if (req.method === 'GET') {
    try {
      const targetId = req.query?.target_id ? Number(req.query.target_id) : null;

      const configs = targetId
        ? await sql`
            SELECT ac.id, ac.target_id, ac.metric, ac.threshold, ac.comparison, ac.enabled, ac.created_at
            FROM alert_configs ac
            WHERE ac.user_id = ${userId}
              AND ac.target_id = ${targetId}
              AND ac.deleted_at IS NULL
            ORDER BY ac.created_at DESC`
        : await sql`
            SELECT ac.id, ac.target_id, ac.metric, ac.threshold, ac.comparison, ac.enabled, ac.created_at
            FROM alert_configs ac
            WHERE ac.user_id = ${userId}
              AND ac.deleted_at IS NULL
            ORDER BY ac.created_at DESC`;

      return res.status(200).json({ configs });
    } catch (err) {
      console.error('[alerts GET]', err);
      return res.status(500).json({ error: 'Failed to fetch alert configs' });
    }
  }

  // POST /api/alerts
  if (req.method === 'POST') {
    const { target_id, metric, threshold, comparison } = req.body ?? {};

    if (!target_id || !metric || threshold === undefined || !comparison) {
      return res.status(400).json({ error: 'target_id, metric, threshold, and comparison are required' });
    }
    if (!ALLOWED_METRICS.has(metric)) {
      return res.status(400).json({ error: `Invalid metric. Allowed: ${[...ALLOWED_METRICS].join(', ')}` });
    }
    if (!['below', 'above'].includes(comparison)) {
      return res.status(400).json({ error: "comparison must be 'below' or 'above'" });
    }
    if (!isFinite(Number(threshold))) {
      return res.status(400).json({ error: 'threshold must be a finite number' });
    }

    // Verify target belongs to this user
    const [target] = await sql`SELECT id FROM targets WHERE id = ${target_id} AND user_id = ${userId}`;
    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    try {
      const [config] = await sql`
        INSERT INTO alert_configs (user_id, target_id, metric, threshold, comparison)
        VALUES (${userId}, ${target_id}, ${metric}, ${Number(threshold)}, ${comparison})
        RETURNING id, target_id, metric, threshold, comparison, enabled, created_at
      `;
      return res.status(201).json({ config });
    } catch (err) {
      // Partial unique index violation: duplicate active config for this target+metric
      if (err.code === '23505') {
        return res.status(409).json({ error: 'An active alert for this metric already exists on this URL' });
      }
      console.error('[alerts POST]', err);
      return res.status(500).json({ error: 'Failed to create alert config' });
    }
  }

  // PATCH /api/alerts/:id
  if (req.method === 'PATCH') {
    const alertId = parseAlertId(req);
    if (!alertId) return res.status(400).json({ error: 'Missing alert id' });

    const [existing] = await sql`
      SELECT id, deleted_at FROM alert_configs WHERE id = ${alertId} AND user_id = ${userId}
    `;
    if (!existing) return res.status(404).json({ error: 'Alert not found' });
    if (existing.deleted_at) return res.status(410).json({ error: 'Alert has been deleted' });

    const { threshold, comparison, enabled } = req.body ?? {};

    if (comparison !== undefined && !['below', 'above'].includes(comparison)) {
      return res.status(400).json({ error: "comparison must be 'below' or 'above'" });
    }
    if (threshold !== undefined && !isFinite(Number(threshold))) {
      return res.status(400).json({ error: 'threshold must be a finite number' });
    }

    try {
      const [updated] = await sql`
        UPDATE alert_configs
        SET
          threshold  = COALESCE(${threshold !== undefined ? Number(threshold) : null}, threshold),
          comparison = COALESCE(${comparison ?? null}, comparison),
          enabled    = COALESCE(${enabled !== undefined ? enabled : null}, enabled)
        WHERE id = ${alertId} AND user_id = ${userId}
        RETURNING id, target_id, metric, threshold, comparison, enabled, created_at
      `;
      return res.status(200).json({ config: updated });
    } catch (err) {
      console.error('[alerts PATCH]', err);
      return res.status(500).json({ error: 'Failed to update alert config' });
    }
  }

  // DELETE /api/alerts/:id — soft-delete
  if (req.method === 'DELETE') {
    const alertId = parseAlertId(req);
    if (!alertId) return res.status(400).json({ error: 'Missing alert id' });

    try {
      const [deleted] = await sql`
        UPDATE alert_configs
        SET deleted_at = NOW()
        WHERE id = ${alertId} AND user_id = ${userId} AND deleted_at IS NULL
        RETURNING id
      `;
      if (!deleted) return res.status(404).json({ error: 'Alert not found or already deleted' });
      return res.status(200).json({ deleted: true });
    } catch (err) {
      console.error('[alerts DELETE]', err);
      return res.status(500).json({ error: 'Failed to delete alert config' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
