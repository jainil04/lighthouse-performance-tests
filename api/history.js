import { verifyToken } from './lib/auth.js';
import { sql } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let userId;
  try {
    const decoded = verifyToken(req);
    userId = decoded.userId;
  } catch (err) {
    return res.status(err.status || 401).json({ error: 'Unauthorized' });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const urlFilter = req.query.url || null;

  try {
    let countRow, runs;

    if (urlFilter) {
      [countRow] = await sql`
        SELECT COUNT(*)::int AS count
        FROM runs r
        JOIN targets t ON t.id = r.target_id
        WHERE r.user_id = ${userId} AND t.url = ${urlFilter}
      `;
      runs = await sql`
        SELECT
          r.id,
          t.url,
          r.device,
          r.status,
          r.created_at,
          r.completed_at,
          r.runs_count,
          MAX(m.value) FILTER (WHERE m.name = 'performance')    AS performance,
          MAX(m.value) FILTER (WHERE m.name = 'accessibility')  AS accessibility,
          MAX(m.value) FILTER (WHERE m.name = 'best-practices') AS best_practices,
          MAX(m.value) FILTER (WHERE m.name = 'seo')            AS seo,
          MAX(m.value) FILTER (WHERE m.name = 'fcp')            AS fcp,
          MAX(m.value) FILTER (WHERE m.name = 'lcp')            AS lcp,
          MAX(m.value) FILTER (WHERE m.name = 'si')             AS si,
          MAX(m.value) FILTER (WHERE m.name = 'cls')            AS cls,
          MAX(m.value) FILTER (WHERE m.name = 'tbt')            AS tbt,
          MAX(m.value) FILTER (WHERE m.name = 'tti')            AS tti
        FROM runs r
        JOIN targets t ON t.id = r.target_id
        LEFT JOIN metrics m ON m.run_id = r.id
        WHERE r.user_id = ${userId} AND t.url = ${urlFilter}
        GROUP BY r.id, t.url, r.device, r.status, r.created_at, r.completed_at, r.runs_count
        ORDER BY r.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      [countRow] = await sql`
        SELECT COUNT(*)::int AS count
        FROM runs r
        JOIN targets t ON t.id = r.target_id
        WHERE r.user_id = ${userId}
      `;
      runs = await sql`
        SELECT
          r.id,
          t.url,
          r.device,
          r.status,
          r.created_at,
          r.completed_at,
          r.runs_count,
          MAX(m.value) FILTER (WHERE m.name = 'performance')    AS performance,
          MAX(m.value) FILTER (WHERE m.name = 'accessibility')  AS accessibility,
          MAX(m.value) FILTER (WHERE m.name = 'best-practices') AS best_practices,
          MAX(m.value) FILTER (WHERE m.name = 'seo')            AS seo,
          MAX(m.value) FILTER (WHERE m.name = 'fcp')            AS fcp,
          MAX(m.value) FILTER (WHERE m.name = 'lcp')            AS lcp,
          MAX(m.value) FILTER (WHERE m.name = 'si')             AS si,
          MAX(m.value) FILTER (WHERE m.name = 'cls')            AS cls,
          MAX(m.value) FILTER (WHERE m.name = 'tbt')            AS tbt,
          MAX(m.value) FILTER (WHERE m.name = 'tti')            AS tti
        FROM runs r
        JOIN targets t ON t.id = r.target_id
        LEFT JOIN metrics m ON m.run_id = r.id
        WHERE r.user_id = ${userId}
        GROUP BY r.id, t.url, r.device, r.status, r.created_at, r.completed_at, r.runs_count
        ORDER BY r.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const n = (v) => v !== null && v !== undefined ? Number(v) : null;
    const formatted = runs.map(r => ({
      id: r.id,
      url: r.url,
      device: r.device,
      runs_count: r.runs_count,
      status: r.status,
      created_at: r.created_at,
      completed_at: r.completed_at,
      scores: {
        performance:    n(r.performance),
        accessibility:  n(r.accessibility),
        best_practices: n(r.best_practices),
        seo:            n(r.seo),
        fcp:            n(r.fcp),
        lcp:            n(r.lcp),
        si:             n(r.si),
        cls:            n(r.cls),
        tbt:            n(r.tbt),
        tti:            n(r.tti),
      },
    }));

    return res.status(200).json({
      runs: formatted,
      total: Number(countRow.count),
      page,
      limit,
      cap: 10,
    });
  } catch (err) {
    console.error('[history]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
