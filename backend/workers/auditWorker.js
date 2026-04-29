import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import {
  prepareBrowser,
  runWarmupAudit,
  runLighthouseAudit,
  calculateAverages,
} from '../../api/lighthouse.js';
import { persistAuditRun } from '../../api/lib/persistAuditRun.js';
import { checkAlerts } from '../../api/lib/checkAlerts.js';

const noop = () => {};

const worker = new Worker('audit', async (job) => {
  const { userId, url, device = 'desktop', runs = 1 } = job.data;
  console.log(`[auditWorker] Processing job ${job.id}: ${url} (${device}, ${runs} run(s))`);

  const isProduction = process.env.NODE_ENV === 'production';
  const { browser, wsEndpoint } = await prepareBrowser(isProduction, noop);
  const lhrObjects = [];
  const runResults = [];

  try {
    await runWarmupAudit({ url, device, wsEndpoint });

    const progressPerRun = 70 / runs;
    for (let i = 0; i < runs; i++) {
      const baseProgressForRun = 30 + (i * progressPerRun);
      const lhr = await runLighthouseAudit({
        url,
        device,
        wsEndpoint,
        onProgress: noop,
        i,
        runs,
        progressPerRun,
        baseProgress: baseProgressForRun,
      });
      lhrObjects.push(lhr);

      if (!lhr.categories) throw new Error('Lighthouse audit returned no categories');

      const scores = {
        performance:   lhr.categories?.performance?.score         ? Math.round(lhr.categories.performance.score * 100) : 0,
        accessibility: lhr.categories?.accessibility?.score       ? Math.round(lhr.categories.accessibility.score * 100) : 0,
        bestPractices: lhr.categories?.['best-practices']?.score  ? Math.round(lhr.categories['best-practices'].score * 100) : 0,
        seo:           lhr.categories?.seo?.score                 ? Math.round(lhr.categories.seo.score * 100) : 0,
      };
      const metrics = {
        firstContentfulPaint:        lhr.audits['first-contentful-paint']?.numericValue || 0,
        largestContentfulPaint:      lhr.audits['largest-contentful-paint']?.numericValue || 0,
        speedIndex:                  lhr.audits['speed-index']?.numericValue || 0,
        totalBlockingTime:           lhr.audits['total-blocking-time']?.numericValue || 0,
        cumulativeLayoutShift:       lhr.audits['cumulative-layout-shift']?.numericValue || 0,
        firstMeaningfulPaint:        lhr.audits['first-meaningful-paint']?.numericValue || 0,
        timeToInteractive:           lhr.audits['interactive']?.numericValue || 0,
        maxPotentialFirstInputDelay: lhr.audits['max-potential-fid']?.numericValue || 0,
        serverResponseTime:          lhr.audits['server-response-time']?.numericValue || 0,
        mainThreadWork:              lhr.audits['mainthread-work-breakdown']?.numericValue || 0,
        bootupTime:                  lhr.audits['bootup-time']?.numericValue || 0,
        totalByteWeight:             lhr.audits['total-byte-weight']?.numericValue || 0,
        unusedJavascript:            lhr.audits['unused-javascript']?.numericValue || 0,
        unusedCssRules:              lhr.audits['unused-css-rules']?.numericValue || 0,
        unoptimizedImages:           lhr.audits['unoptimized-images']?.numericValue || 0,
        modernImageFormats:          lhr.audits['modern-image-formats']?.numericValue || 0,
        efficientAnimatedContent:    lhr.audits['efficient-animated-content']?.numericValue || 0,
        renderBlockingResources:     lhr.audits['render-blocking-resources']?.numericValue || 0,
        duplicatedJavascript:        lhr.audits['duplicated-javascript']?.numericValue || 0,
        legacyJavascript:            lhr.audits['legacy-javascript']?.numericValue || 0,
      };

      runResults.push({ scores, metrics, run: i + 1 });
    }

    const averages = runs > 1 ? calculateAverages(runResults) : null;
    const finalScores  = averages ? averages.scores  : runResults[0].scores;
    const finalMetrics = averages ? averages.metrics : runResults[0].metrics;

    const { runId, targetId } = await persistAuditRun({ userId, url, device, runs, auditView: 'standard', finalScores, finalMetrics, lhrObjects });
    console.log(`[auditWorker] Job ${job.id} completed for ${url}`);

    // Alert delivery is best-effort: a failure here must not fail the job,
    // because the audit itself succeeded and results are already persisted.
    try {
      await checkAlerts({ runId, targetId, userId, metrics: { ...finalScores, ...finalMetrics }, url });
    } catch (err) {
      console.error(`[auditWorker] checkAlerts error for job ${job.id}:`, err.message);
    }
  } finally {
    try { await browser.close(); } catch (e) { console.error('[auditWorker] browser close error:', e); }
  }
}, {
  connection: redisConnection,
});

// Without an 'error' handler, any emitted error throws as an uncaught exception
// in Node.js 22, silently killing the worker after the "started" log.
worker.on('error', (err) => {
  console.error('[auditWorker] Worker error:', err.message, err.stack);
});

worker.on('failed', (job, err) => {
  console.error(`[auditWorker] Job ${job?.id} failed:`, err.message);
});

worker.on('active', (job) => {
  console.log(`[auditWorker] Job ${job.id} claimed from queue, starting processor`);
});

worker.on('drained', () => {
  console.log('[auditWorker] Queue drained — waiting for new jobs');
});

redisConnection.on('error', (err) => {
  console.error('[auditWorker] Redis connection error:', err.message);
});

console.log('[auditWorker] Worker started, listening on queue: audit');
