import { sql } from './db.js';

export async function persistAuditRun({ userId, url, device, runs, auditView, finalScores, finalMetrics, lhrObjects }) {
  // Upsert-style: find existing target for this user+url or create one
  let [target] = await sql`SELECT id FROM targets WHERE user_id = ${userId} AND url = ${url}`;
  if (!target) {
    [target] = await sql`
      INSERT INTO targets (user_id, url) VALUES (${userId}, ${url}) RETURNING id
    `;
  }

  // Create run in pending state so we hold a run_id for FK children
  const [run] = await sql`
    INSERT INTO runs (target_id, user_id, device, status, runs_count)
    VALUES (${target.id}, ${userId}, ${device}, 'pending', ${runs})
    RETURNING id
  `;

  // Persist category scores (for history filtering) + the six Core Web Vitals
  const metricsToInsert = [
    { name: 'performance',    value: finalScores.performance,    unit: 'score' },
    { name: 'accessibility',  value: finalScores.accessibility,  unit: 'score' },
    { name: 'best-practices', value: finalScores.bestPractices,  unit: 'score' },
    { name: 'seo',            value: finalScores.seo,            unit: 'score' },
    { name: 'fcp', value: finalMetrics.firstContentfulPaint,   unit: 'ms' },
    { name: 'lcp', value: finalMetrics.largestContentfulPaint, unit: 'ms' },
    { name: 'cls', value: finalMetrics.cumulativeLayoutShift,  unit: '' },
    { name: 'tbt', value: finalMetrics.totalBlockingTime,      unit: 'ms' },
    { name: 'si',  value: finalMetrics.speedIndex,             unit: 'ms' },
    { name: 'tti', value: finalMetrics.timeToInteractive,      unit: 'ms' },
  ];
  for (const m of metricsToInsert) {
    await sql`
      INSERT INTO metrics (run_id, name, value, unit)
      VALUES (${run.id}, ${m.name}, ${m.value}, ${m.unit})
    `;
  }

  // Store the full lhr only when the user requested a full audit view
  if (auditView === 'full' && lhrObjects.length > 0) {
    await sql`
      INSERT INTO run_artifacts (run_id, lhr_json)
      VALUES (${run.id}, ${lhrObjects[0]})
    `;
  }

  await sql`
    UPDATE runs SET status = 'complete', completed_at = NOW() WHERE id = ${run.id}
  `;

  // Enforce 10-run cap: delete any runs beyond the 10 most recent for this user.
  // Single DELETE keeps the operation atomic — no window where the user has 11 rows.
  await sql`
    DELETE FROM runs
    WHERE user_id = ${userId}
    AND id NOT IN (
      SELECT id FROM runs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 10
    )
  `;

  return { runId: run.id, targetId: target.id };
}
