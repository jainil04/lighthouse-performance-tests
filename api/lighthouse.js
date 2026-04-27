import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-core';
import { getLaunchConfig } from './utils/getLaunchConfig.js';
import { getLighthouseConfig } from './utils/getLighthouseConfig.js';
import { verifyToken } from './lib/auth.js';
import { sql } from './lib/db.js';

// Force English locale to prevent missing locale file errors
process.env.LC_ALL = 'en_US.UTF-8';
process.env.LANG = 'en_US.UTF-8';
process.env.LANGUAGE = 'en_US';
process.env.LIGHTHOUSE_LOCALE = 'en-US';

// Prepare and launch the browser, return { browser, wsEndpoint }
async function prepareBrowser(isProduction, onProgress) {
  onProgress({
    type: 'progress',
    message: isProduction
      ? 'Configuring Chrome for serverless environment...'
      : 'Configuring Chrome for local development...',
    progress: 10,
    stage: 'browser-setup',
    timestamp: new Date().toISOString()
  });
  const launchConfig = await getLaunchConfig(isProduction);

  onProgress({
    type: 'progress',
    message: 'Launching Chrome browser...',
    progress: 20,
    stage: 'browser-launch',
    timestamp: new Date().toISOString()
  });

  const browser = await puppeteer.launch(launchConfig);
  const wsEndpoint = browser.wsEndpoint();

  onProgress({
    type: 'progress',
    message: 'Chrome launched successfully, preparing Lighthouse...',
    progress: 30,
    stage: 'lighthouse-setup',
    timestamp: new Date().toISOString()
  });

  return { browser, wsEndpoint };
}

// Warmup run — result is discarded; warms up Chrome + Lighthouse before real runs.
// No progress events, no run-complete event, not added to runResults or lhrObjects.
async function runWarmupAudit({ url, device, wsEndpoint }) {
  const lighthouseConfig = getLighthouseConfig(device);
  const lighthouseOptions = {
    port: new URL(wsEndpoint).port,
    output: 'json',
    logLevel: 'error'
  };
  await lighthouse(url, lighthouseOptions, lighthouseConfig);
}

// Run Lighthouse audit and handle progress simulation
async function runLighthouseAudit({ url, device, wsEndpoint, onProgress, i, runs, progressPerRun, baseProgress }) {
  const lighthouseConfig = getLighthouseConfig(device);
  const runStartProgress = baseProgress || Math.round(i * progressPerRun);
  onProgress({
    type: 'progress',
    message: `Running audit ${i + 1}/${runs} for ${url}`,
    progress: runStartProgress,
    stage: 'audit',
    currentRun: i + 1,
    totalRuns: runs,
    timestamp: new Date().toISOString()
  });

  const lighthouseOptions = {
    port: new URL(wsEndpoint).port,
    output: 'json',
    logLevel: 'error'
  };

  // Progress simulation with proper incremental progress
  let auditProgress = runStartProgress + 10; // Start at 10% into this run
  const progressInterval = setInterval(() => {
    // Gradually increase progress by 5-10% each interval
    auditProgress += Math.floor(Math.random() * 5) + 5;

    // Cap progress at 90% of this run's allocation to leave room for completion
    const maxProgressForThisRun = runStartProgress + (progressPerRun * 0.9);
    auditProgress = Math.min(auditProgress, maxProgressForThisRun);

    onProgress({
      type: 'progress',
      message: 'Running Lighthouse audit...',
      progress: auditProgress,
      stage: 'audit-running',
      currentRun: i + 1,
      totalRuns: runs,
      timestamp: new Date().toISOString()
    });
  }, 2000);

  let lhr;
  try {
    ({ lhr } = await lighthouse(url, lighthouseOptions, lighthouseConfig));
  } finally {
    clearInterval(progressInterval);
  }

  return lhr;
}

// Handle errors and send error progress
function handleError({ onProgress, error, url, device, throttle, executionTime, isProduction }) {
  console.error('Lighthouse streaming audit failed:', error);

  onProgress({
    type: 'error',
    error: error.message,
    url,
    device,
    throttle,
    executionTime,
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    stack: error.stack
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  // Optional auth — authenticated users get DB persistence, guests don't
  let userId = null;
  try {
    userId = verifyToken(req).userId;
  } catch {
    // No valid token — audit runs normally, results are not persisted
  }

  const { url, device = 'desktop', throttle = 'none', runs = 1, auditView = 'standard' } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required',
      message: 'Please provide a valid URL to audit'
    });
  }

  // Set up Server-Sent Events (SSE) headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const startTime = Date.now();
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
  let browser;
  // Hoisted so the finally block can persist results without them going out of scope
  let runResults = [];
  let lhrObjects = [];
  let finalScores = null;
  let finalMetrics = null;

  // Global progress tracking to ensure monotonic increase
  let globalProgress = 0;

  // Progress callback function with monotonic increase
  const onProgress = (data) => {
    // Ensure progress only increases
    if (data.progress && data.progress > globalProgress) {
      globalProgress = data.progress;
    } else if (data.progress) {
      data.progress = globalProgress;
    }

    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    globalProgress = 0;
    onProgress({
      type: 'progress',
      message: 'Launching Chrome browser...',
      progress: globalProgress,
      stage: 'initialization',
      timestamp: new Date().toISOString()
    });

    // Prepare browser and get wsEndpoint
    const browserResult = await prepareBrowser(isProduction, onProgress);
    browser = browserResult.browser;
    const wsEndpoint = browserResult.wsEndpoint;

    // Warmup run — consumes the 0–30% initialization phase silently.
    // prepareBrowser already emitted up to 30%; this run warms up Chrome + Lighthouse
    // and is excluded from results, averages, run-complete events, and DB persistence.
    await runWarmupAudit({ url, device, wsEndpoint });
    globalProgress = Math.max(globalProgress, 30);

    // Real runs: 30–100%, divided equally across N user-requested runs
    const progressPerRun = 70 / runs;
    for (let i = 0; i < runs; i++) {
      const baseProgressForRun = 30 + (i * progressPerRun);
      globalProgress = Math.max(globalProgress, baseProgressForRun);

      // Run Lighthouse audit
      const lhr = await runLighthouseAudit({
        url,
        device,
        wsEndpoint,
        onProgress,
        i,
        runs,
        progressPerRun,
        baseProgress: baseProgressForRun
      });
      lhrObjects.push(lhr);
      const executionTime = Date.now() - startTime;

      // Extract scores and key metrics
      if (!lhr.categories) {
        console.error('Lighthouse results missing categories');
        throw new Error('Lighthouse audit failed - no categories in results');
      }

      const scores = {
        performance: lhr.categories?.performance?.score ? Math.round(lhr.categories.performance.score * 100) : 0,
        accessibility: lhr.categories?.accessibility?.score ? Math.round(lhr.categories.accessibility.score * 100) : 0,
        bestPractices: lhr.categories?.['best-practices']?.score ? Math.round(lhr.categories['best-practices'].score * 100) : 0,
        seo: lhr.categories?.seo?.score ? Math.round(lhr.categories.seo.score * 100) : 0
      };

      // Log if performance score is 0 to debug
      if (scores.performance === 0) {
        console.log('Performance score is 0. Raw score:', lhr.categories?.performance?.score);
        console.log('Performance category:', lhr.categories?.performance);
      }

      // Extract comprehensive metrics
      const metrics = {
        // Core Web Vitals
        firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue || 0,
        largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue || 0,
        speedIndex: lhr.audits['speed-index']?.numericValue || 0,
        totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue || 0,
        cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue || 0,

        // Additional Performance Metrics
        firstMeaningfulPaint: lhr.audits['first-meaningful-paint']?.numericValue || 0,
        timeToInteractive: lhr.audits['interactive']?.numericValue || 0,
        maxPotentialFirstInputDelay: lhr.audits['max-potential-fid']?.numericValue || 0,

        // Network & Resource Metrics
        serverResponseTime: lhr.audits['server-response-time']?.numericValue || 0,
        mainThreadWork: lhr.audits['mainthread-work-breakdown']?.numericValue || 0,
        bootupTime: lhr.audits['bootup-time']?.numericValue || 0,

        // Resource Metrics
        totalByteWeight: lhr.audits['total-byte-weight']?.numericValue || 0,
        unusedJavascript: lhr.audits['unused-javascript']?.numericValue || 0,
        unusedCssRules: lhr.audits['unused-css-rules']?.numericValue || 0,

        // Image Optimization
        unoptimizedImages: lhr.audits['unoptimized-images']?.numericValue || 0,
        modernImageFormats: lhr.audits['modern-image-formats']?.numericValue || 0,
        efficientAnimatedContent: lhr.audits['efficient-animated-content']?.numericValue || 0,

        // Additional Opportunities
        renderBlockingResources: lhr.audits['render-blocking-resources']?.numericValue || 0,
        duplicatedJavascript: lhr.audits['duplicated-javascript']?.numericValue || 0,
        legacyJavascript: lhr.audits['legacy-javascript']?.numericValue || 0
      };

      // Extract opportunities (potential savings)
      const opportunities = {};
      Object.keys(lhr.audits).forEach(auditKey => {
        const audit = lhr.audits[auditKey];
        if (audit.details && audit.details.overallSavingsMs) {
          opportunities[auditKey] = {
            title: audit.title,
            description: audit.description,
            savingsMs: audit.details.overallSavingsMs,
            savingsBytes: audit.details.overallSavingsBytes || 0,
            score: audit.score
          };
        }
      });

      // Extract diagnostics
      const diagnostics = {};
      Object.keys(lhr.audits).forEach(auditKey => {
        const audit = lhr.audits[auditKey];
        if (audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'notApplicable') {
          diagnostics[auditKey] = {
            title: audit.title,
            description: audit.description,
            displayValue: audit.displayValue,
            score: audit.score,
            numericValue: audit.numericValue
          };
        }
      });

      runResults.push({
        diagnostics,
        metrics,
        opportunities,
        run: i + 1,
        scores,
        timestamp: new Date().toISOString(),
        url: lhr.finalUrl || url,
        ...(auditView === 'full' && {
          fullReport: {
            categories: lhr.categories,
            audits: lhr.audits,
            configSettings: lhr.configSettings
          }
        })
      });
      const runCompleteProgress = Math.round(30 + (i + 1) * progressPerRun);
      console.log(`[PROGRESS] Completed run ${i + 1}/${runs} - Progress: ${runCompleteProgress}%`);
      onProgress({
        type: 'run-complete',
        message: `Completed run ${i + 1}/${runs}`,
        progress: runCompleteProgress,
        stage: 'run-complete',
        currentRun: i + 1,
        totalRuns: runs,
        runResult: {
          run: i + 1,
          scores,
          metrics,
          opportunities,
          diagnostics
        }
      });
      // Small delay to ensure proper SSE flushing before next run
      if (i < runs - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    globalProgress = Math.max(globalProgress, 95);
    onProgress({
      type: 'progress',
      message: 'Processing final results...',
      progress: globalProgress,
      stage: 'finalizing'
    });

    const summary = {
      totalRuns: runs,
      url,
      device,
      throttle,
      auditView
    };

    if (runs > 1) {
      const averages = calculateAverages(runResults);
      finalScores = averages.scores;
      finalMetrics = averages.metrics;
      globalProgress = 100;
      onProgress({
        type: 'complete',
        data: {
          runs: runResults,
          averages,
          summary
        }
      });
    } else {
      finalScores = runResults[0].scores;
      finalMetrics = runResults[0].metrics;
      globalProgress = 100;
      onProgress({
        type: 'complete',
        data: {
          run: runResults[0],
          summary
        }
      });
    }

    // Persist before res.end() — Vercel terminates the function once the response is sent,
    // so any await in finally after res.end() is not guaranteed to complete.
    if (userId && runResults.length > 0 && finalScores) {
      try {
        await persistAuditRun({ userId, url, device, runs, auditView, finalScores, finalMetrics, lhrObjects });
      } catch (dbErr) {
        console.error('[persist]', dbErr);
      }
    }

    res.end();
  } catch (error) {
    const executionTime = Date.now() - startTime;
    handleError({ onProgress, error, url, device, throttle, executionTime, isProduction });
    res.end();
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

function calculateAverages(results) {
  const avgScores = {
    performance: 0,
    accessibility: 0,
    bestPractices: 0,
    seo: 0
  };

  // Get all metric keys from the first result
  const metricKeys = Object.keys(results[0].metrics);
  const avgMetrics = {};
  metricKeys.forEach(key => {
    avgMetrics[key] = 0;
  });

  results.forEach(result => {
    Object.keys(avgScores).forEach(key => {
      avgScores[key] += result.scores[key];
    });

    Object.keys(avgMetrics).forEach(key => {
      avgMetrics[key] += result.metrics[key] || 0;
    });
  });

  const count = results.length;

  Object.keys(avgScores).forEach(key => {
    avgScores[key] = Math.round(avgScores[key] / count);
  });

  Object.keys(avgMetrics).forEach(key => {
    avgMetrics[key] = Math.round(avgMetrics[key] / count);
  });

  // Aggregate opportunities and diagnostics (take from first result since they're not numerical averages)
  const opportunities = results[0].opportunities || {};
  const diagnostics = results[0].diagnostics || {};

  return {
    scores: avgScores,
    metrics: avgMetrics,
    opportunities,
    diagnostics
  };
}

async function persistAuditRun({ userId, url, device, runs, auditView, finalScores, finalMetrics, lhrObjects }) {
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
}