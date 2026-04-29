import { sql } from './db.js';
import { sendAlertEmail } from './email.js';

const ALLOWED_METRICS = new Set([
  'performance', 'accessibility', 'best_practices', 'seo',
  'fcp', 'lcp', 'cls', 'tbt', 'si', 'tti',
]);

export async function checkAlerts({ runId, targetId, userId, metrics, url }) {
  const configs = await sql`
    SELECT id, metric, threshold, comparison
    FROM alert_configs
    WHERE target_id = ${targetId} AND enabled = TRUE AND deleted_at IS NULL
  `;

  if (!configs.length) return;

  for (const config of configs) {
    try {
      await evaluateConfig({ config, runId, userId, metrics, url });
    } catch (err) {
      console.error(`[checkAlerts] Error processing config ${config.id}:`, err.message);
    }
  }
}

async function evaluateConfig({ config, runId, userId, metrics, url }) {
  const { id: configId, metric, threshold, comparison } = config;

  if (!ALLOWED_METRICS.has(metric)) return;

  // Map metric names to the keys in the metrics object passed from the worker
  const value = resolveMetricValue(metric, metrics);
  if (value === undefined || value === null) return;

  const breached =
    comparison === 'below' ? value < threshold :
    comparison === 'above' ? value > threshold :
    false;

  if (!breached) return;

  // Idempotency: check for an existing event row for this config+run pair.
  // Ordering: insert row first, then send email, then update. A crash between
  // insert and send retries on the next run rather than silently dropping the alert.
  const [existing] = await sql`
    SELECT id, email_sent_at FROM alert_events
    WHERE alert_config_id = ${configId} AND run_id = ${runId}
  `;

  if (existing?.email_sent_at) return; // already sent

  let eventId;
  if (existing) {
    eventId = existing.id;
  } else {
    const [inserted] = await sql`
      INSERT INTO alert_events (alert_config_id, run_id, metric_value, threshold)
      VALUES (${configId}, ${runId}, ${value}, ${threshold})
      RETURNING id
    `;
    eventId = inserted.id;
  }

  const [user] = await sql`SELECT email FROM users WHERE id = ${userId}`;
  if (!user) return;

  try {
    await sendAlertEmail({ to: user.email, url, metric, value, threshold, comparison, runId });
    await sql`
      UPDATE alert_events SET email_sent_at = NOW() WHERE id = ${eventId}
    `;
  } catch (err) {
    await sql`
      UPDATE alert_events SET email_error = ${err.message} WHERE id = ${eventId}
    `;
    throw err;
  }
}

function resolveMetricValue(metric, metrics) {
  // metrics object from persistAuditRun uses camelCase CWV keys and score keys
  const map = {
    performance:    metrics.performance    ?? metrics.scores?.performance,
    accessibility:  metrics.accessibility  ?? metrics.scores?.accessibility,
    best_practices: metrics.bestPractices  ?? metrics.scores?.bestPractices,
    seo:            metrics.seo            ?? metrics.scores?.seo,
    fcp:            metrics.fcp ?? metrics.firstContentfulPaint,
    lcp:            metrics.lcp ?? metrics.largestContentfulPaint,
    cls:            metrics.cls ?? metrics.cumulativeLayoutShift,
    tbt:            metrics.tbt ?? metrics.totalBlockingTime,
    si:             metrics.si  ?? metrics.speedIndex,
    tti:            metrics.tti ?? metrics.timeToInteractive,
  };
  return map[metric];
}
