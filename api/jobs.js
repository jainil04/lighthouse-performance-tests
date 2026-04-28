import { verifyToken } from './lib/auth.js';
import { sql } from './lib/db.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// BullMQ requires a real Redis TCP connection via ioredis.
// @upstash/redis uses HTTP and cannot be used as a BullMQ connection.
// KV_URL is provisioned by the Vercel KV integration as a rediss:// ioredis-compatible URL.
function createRedisConnection() {
  const opts = { maxRetriesPerRequest: null, enableReadyCheck: false };
  return process.env.KV_URL
    ? new IORedis(process.env.KV_URL, opts)
    : new IORedis(opts);
}

export default async function handler(req, res) {
  if (!process.env.KV_URL) {
    return res.status(500).json({ error: 'KV_URL is not set' });
  }
  let userId;
  try {
    ({ userId } = verifyToken(req));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  if (req.method === 'GET') {
    try {
      const targets = await sql`
        SELECT id, url, schedule, created_at
        FROM targets
        WHERE user_id = ${userId} AND schedule IS NOT NULL
        ORDER BY created_at DESC
      `;
      return res.status(200).json({ targets });
    } catch (err) {
      console.error('[jobs GET]', err);
      return res.status(500).json({ error: 'Failed to fetch scheduled jobs' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, device = 'desktop', runs = 1, schedule } = req.body;
  if (!url || !schedule) {
    return res.status(400).json({ error: 'url and schedule are required' });
  }

  try {
    // Upsert the target row and set the schedule column
    let [target] = await sql`SELECT id FROM targets WHERE user_id = ${userId} AND url = ${url}`;
    if (!target) {
      [target] = await sql`
        INSERT INTO targets (user_id, url, schedule)
        VALUES (${userId}, ${url}, ${schedule})
        RETURNING id
      `;
    } else {
      await sql`UPDATE targets SET schedule = ${schedule} WHERE id = ${target.id}`;
    }

    const connection = createRedisConnection();
    const queue = new Queue('audit', { connection });
    let job;
    try {
      job = await queue.add('audit', { userId, url, device, runs }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    } finally {
      await queue.close();
      connection.disconnect();
    }

    return res.status(201).json({ jobId: job.id, url, schedule });
  } catch (err) {
    console.error('[jobs POST]', err);
    return res.status(500).json({ error: 'Failed to enqueue job' });
  }
}
