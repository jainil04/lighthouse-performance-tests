// import lighthouse from 'lighthouse';
// import puppeteer from 'puppeteer-core';
// import fs from 'fs';
// import { getLaunchConfig } from './utils/getLaunchConfig.js';
// import { getLighthouseConfig } from './utils/getLighthouseConfig.js';
import { setAuditStatus, getAuditStatus } from './utils/auditStatusStore.js';
import backgroundAuditHandler from './background-audit.js';

// Force English locale to prevent missing locale file errors
process.env.LC_ALL = 'en_US.UTF-8';
process.env.LANG = 'en_US.UTF-8';
process.env.LANGUAGE = 'en_US';
process.env.LIGHTHOUSE_LOCALE = 'en-US';

// Prepare and launch the browser, return { browser, wsEndpoint }
async function prepareBrowser(isProduction, onProgress, currentRun = 1, totalRuns = 1) {
  onProgress({
    type: 'progress',
    message: isProduction
      ? 'Configuring Chrome for serverless environment...'
      : 'Configuring Chrome for local development...',
    progress: 10,
    stage: 'browser-setup',
    timestamp: new Date().toISOString(),
    currentRun,
    totalRuns
  });
  const launchConfig = await getLaunchConfig(isProduction);

  onProgress({
    type: 'progress',
    message: 'Launching Chrome browser...',
    progress: 15,
    stage: 'browser-launch',
    timestamp: new Date().toISOString(),
    currentRun,
    totalRuns
  });

  const browser = await puppeteer.launch(launchConfig);
  const wsEndpoint = browser.wsEndpoint();

  onProgress({
    type: 'progress',
    message: 'Chrome launched successfully, preparing Lighthouse...',
    progress: 25,
    stage: 'lighthouse-setup',
    timestamp: new Date().toISOString(),
    currentRun,
    totalRuns
  });

  return { browser, wsEndpoint };
}

// Run Lighthouse audit and handle progress simulation
async function runLighthouseAudit({ url, device, wsEndpoint, onProgress, i, runs, progressPerRun }) {
  const lighthouseConfig = getLighthouseConfig(device);
  const runStartProgress = Math.round(i * progressPerRun);
  onProgress({
    type: 'progress',
    message: `Running audit ${i + 1}/${runs} for ${url}`,
    progress: runStartProgress,
    stage: 'audit',
    timestamp: new Date().toISOString(),
    totalRuns: runs,
    currentRun: i + 1,
  });

  const lighthouseOptions = {
    port: new URL(wsEndpoint).port,
    output: 'json',
    logLevel: 'error'
  };

  // Progress simulation with proper run context and more frequent updates
  let simulatedProgress = 10; // Start at 10%
  const maxProgress = 90; // Don't go above 90% until audit completes
  const progressInterval = setInterval(() => {
    // Increment progress gradually
    simulatedProgress += Math.random() * 15 + 5; // Increase by 5-20% each time
    if (simulatedProgress > maxProgress) simulatedProgress = maxProgress;

    onProgress({
      type: 'progress',
      message: `Analyzing performance... (${i + 1}/${runs})`,
      progress: Math.round(simulatedProgress),
      stage: 'audit-running',
      timestamp: new Date().toISOString(),
      currentRun: i + 1,
      totalRuns: runs
    });
  }, 1000); // Send update every second

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
  // Quick health check for GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Lighthouse API is running',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  const { url, device = 'desktop', throttle = 'none', runs = 1, auditView = 'standard', usePolling = false } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required',
      message: 'Please provide a valid URL to audit'
    });
  }

  // Generate unique audit ID
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // If polling mode, return audit ID immediately and run audit in background
  if (usePolling) {
    console.log(`[POLLING] Starting background audit ${auditId}`);

    // Set initial status - the frontend will advance it via polling
    console.log(`[POLLING] Setting initial status for ${auditId}`);
    setAuditStatus(auditId, {
      type: 'start',
      message: 'Audit initialized, waiting for progress...',
      progress: 0,
      stage: 'starting',
      step: -1, // Will be advanced to 0 on first poll
      timestamp: new Date().toISOString()
    });

    // Send immediate response with audit ID
    res.setHeader('X-Audit-ID', auditId);
    return res.status(200).json({
      success: true,
      auditId,
      message: 'Audit started in background, use polling to get updates'
    });
  }  // Original SSE mode (kept for compatibility but will be buffered on Vercel)
  // Set up Server-Sent Events (SSE) headers with aggressive anti-buffering
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
    'X-Nginx-Buffering': 'no', // Alternative nginx header
    'Transfer-Encoding': 'chunked',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Audit-ID': auditId // Send audit ID in header for polling fallback
  });

  // Send multiple newlines to force stream initialization
  res.write('\n\n\n');
  if (res.flush) res.flush();
  if (res.flushHeaders) res.flushHeaders();

  const startTime = Date.now();
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
  let browser;

  // Progress callback function with aggressive flushing and polling backup
  const onProgress = async (data) => {
    // Always update polling status using shared store
    try {
      setAuditStatus(auditId, data);
      console.log(`[STATUS] Updated polling status: ${data.type} - ${data.message} (${data.progress}%)`);
    } catch (statusError) {
      console.log('[STATUS] Failed to update polling status:', statusError.message);
    }

    // For SSE mode, also send via stream (will be buffered on Vercel)
    if (!usePolling) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      const paddedMessage = message + ' '.repeat(Math.max(0, 1024 - message.length)) + '\n';

      res.write(paddedMessage);
      if (res.flush) res.flush();
      if (res.flushHeaders) res.flushHeaders();
      if (res.socket && res.socket.uncork) {
        res.socket.uncork();
      }
      console.log(`[SSE] Sent: ${data.type} - ${data.message} (${data.progress}%)`);
    }
  };  try {
    // Send immediate connection test to verify SSE is working
    onProgress({
      type: 'start',
      message: 'Connection established, starting audit...',
      progress: 0,
      stage: 'connection',
      timestamp: new Date().toISOString(),
      totalRuns: runs
    });

    // Add a small delay and send another update to test streaming
    await new Promise(resolve => setTimeout(resolve, 100));

    onProgress({
      type: 'progress',
      message: 'Preparing audit environment...',
      progress: 2,
      stage: 'preparation',
      timestamp: new Date().toISOString(),
      currentRun: 1,
      totalRuns: runs
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    onProgress({
      type: 'progress',
      message: 'Launching Chrome browser...',
      progress: 5,
      stage: 'initialization',
      timestamp: new Date().toISOString(),
      currentRun: 1,
      totalRuns: runs
    });

    // Prepare browser and get wsEndpoint
    const browserResult = await prepareBrowser(isProduction, onProgress, 1, runs);
    browser = browserResult.browser;
    const wsEndpoint = browserResult.wsEndpoint;
    // Multiple runs support
    const runResults = [];
    for (let i = 0; i < runs; i++) {
      const progressPerRun = 100 / runs;
      // Run Lighthouse audit
      const lhr = await runLighthouseAudit({ url, device, wsEndpoint, onProgress, i, runs, progressPerRun });
      const executionTime = Date.now() - startTime;

      // Extract scores and key metrics
      const scores = {
        performance: Math.round(lhr.categories.performance?.score * 100) || 0,
        accessibility: Math.round(lhr.categories.accessibility?.score * 100) || 0,
        bestPractices: Math.round(lhr.categories['best-practices']?.score * 100) || 0,
        seo: Math.round(lhr.categories.seo?.score * 100) || 0
      };

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
      const runCompleteProgress = Math.round((i + 1) * progressPerRun);
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

    onProgress({
      type: 'progress',
      message: 'Processing final results...',
      progress: 100,
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
      onProgress({
        type: 'complete',
        data: {
          runs: runResults,
          averages,
          summary
        }
      });
    } else {
      onProgress({
        type: 'complete',
        data: {
          run: runResults[0],
          summary
        }
      });
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

// Simple audit progress simulation for testing
async function simulateAuditProgressDirect(auditId) {
  console.log(`[SIMULATION] Starting progress simulation for ${auditId}`);

  const steps = [
    { progress: 10, message: 'Preparing browser...', type: 'progress' },
    { progress: 25, message: 'Launching Chrome...', type: 'progress' },
    { progress: 40, message: 'Loading page...', type: 'progress' },
    { progress: 60, message: 'Running Lighthouse...', type: 'progress' },
    { progress: 80, message: 'Analyzing results...', type: 'progress' },
    { progress: 100, message: 'Audit completed!', type: 'complete' }
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`[SIMULATION] ${auditId}: ${step.message} (${step.progress}%)`);

    setAuditStatus(auditId, {
      type: step.type,
      message: step.message,
      progress: step.progress,
      stage: step.type === 'complete' ? 'complete' : 'running',
      timestamp: new Date().toISOString(),
      ...(step.type === 'complete' && {
        data: {
          run: {
            scores: { performance: 85, accessibility: 92, bestPractices: 88, seo: 90 },
            metrics: { firstContentfulPaint: 1200, largestContentfulPaint: 2100 },
            url: 'https://example.com'
          }
        }
      })
    });

    // Wait between steps (except for the last one)
    if (i < steps.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`[SIMULATION] Completed simulation for ${auditId}`);
}

// Shared storage for audit statuses (import from audit-status.js)
import auditStatusModule from './audit-status.js';

// Background audit function for polling mode
async function runAuditInBackground(auditId, { url, device, throttle, runs, auditView }, req) {
  console.log(`[BACKGROUND] ===== STARTING BACKGROUND AUDIT ${auditId} =====`);
  console.log(`[BACKGROUND] URL: ${url}`);
  console.log(`[BACKGROUND] Config: device=${device}, throttle=${throttle}, runs=${runs}, auditView=${auditView}`);

  const startTime = Date.now();
  let browser;

  // Progress callback for background audit - directly update shared storage
  const onProgress = async (data) => {
    try {
      // Directly update the shared status store
      console.log(`[BACKGROUND] Updating status: ${data.type} - ${data.message} (${data.progress}%)`);
      setAuditStatus(auditId, data);
      console.log(`[BACKGROUND] Status updated successfully`);
    } catch (statusError) {
      console.error('[BACKGROUND] Failed to update status:', statusError.message);
    }
  };

  console.log(`[BACKGROUND] Progress callback defined, starting audit process...`);  try {
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

    // Send initial status
    await onProgress({
      type: 'start',
      message: 'Background audit started...',
      progress: 0,
      stage: 'connection',
      timestamp: new Date().toISOString(),
      totalRuns: runs
    });

    await onProgress({
      type: 'progress',
      message: 'Preparing audit environment...',
      progress: 2,
      stage: 'preparation',
      timestamp: new Date().toISOString(),
      currentRun: 1,
      totalRuns: runs
    });

    // Prepare browser
    const browserResult = await prepareBrowser(isProduction, onProgress, 1, runs);
    browser = browserResult.browser;
    const wsEndpoint = browserResult.wsEndpoint;

    // Run audits
    const runResults = [];
    for (let i = 0; i < runs; i++) {
      const progressPerRun = 100 / runs;
      const lhr = await runLighthouseAudit({ url, device, wsEndpoint, onProgress, i, runs, progressPerRun });

      // Process results (same as main function)
      const scores = {
        performance: Math.round(lhr.categories.performance?.score * 100) || 0,
        accessibility: Math.round(lhr.categories.accessibility?.score * 100) || 0,
        bestPractices: Math.round(lhr.categories['best-practices']?.score * 100) || 0,
        seo: Math.round(lhr.categories.seo?.score * 100) || 0
      };

      const metrics = {
        firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue || 0,
        largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue || 0,
        speedIndex: lhr.audits['speed-index']?.numericValue || 0,
        totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue || 0,
        cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
        firstMeaningfulPaint: lhr.audits['first-meaningful-paint']?.numericValue || 0,
        timeToInteractive: lhr.audits['interactive']?.numericValue || 0,
        maxPotentialFirstInputDelay: lhr.audits['max-potential-fid']?.numericValue || 0,
        serverResponseTime: lhr.audits['server-response-time']?.numericValue || 0,
        mainThreadWork: lhr.audits['mainthread-work-breakdown']?.numericValue || 0,
        bootupTime: lhr.audits['bootup-time']?.numericValue || 0,
        totalByteWeight: lhr.audits['total-byte-weight']?.numericValue || 0,
        unusedJavascript: lhr.audits['unused-javascript']?.numericValue || 0,
        unusedCssRules: lhr.audits['unused-css-rules']?.numericValue || 0,
        unoptimizedImages: lhr.audits['unoptimized-images']?.numericValue || 0,
        modernImageFormats: lhr.audits['modern-image-formats']?.numericValue || 0,
        efficientAnimatedContent: lhr.audits['efficient-animated-content']?.numericValue || 0,
        renderBlockingResources: lhr.audits['render-blocking-resources']?.numericValue || 0,
        duplicatedJavascript: lhr.audits['duplicated-javascript']?.numericValue || 0,
        legacyJavascript: lhr.audits['legacy-javascript']?.numericValue || 0
      };

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

      const runCompleteProgress = Math.round((i + 1) * (100 / runs));
      await onProgress({
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

      if (i < runs - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await onProgress({
      type: 'progress',
      message: 'Processing final results...',
      progress: 100,
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
      await onProgress({
        type: 'complete',
        message: 'Audit completed successfully!',
        progress: 100,
        data: {
          runs: runResults,
          averages,
          summary
        }
      });
    } else {
      await onProgress({
        type: 'complete',
        message: 'Audit completed successfully!',
        progress: 100,
        data: {
          run: runResults[0],
          summary
        }
      });
    }

    console.log(`[BACKGROUND] Audit ${auditId} completed successfully`);

  } catch (error) {
    console.error(`[BACKGROUND] Audit ${auditId} failed:`, error);
    const executionTime = Date.now() - startTime;

    await onProgress({
      type: 'error',
      message: error.message,
      error: true,
      url,
      device,
      throttle,
      executionTime,
      timestamp: new Date().toISOString(),
      environment: (process.env.VERCEL || process.env.NODE_ENV === 'production') ? 'production' : 'development',
      stack: error.stack
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error(`[BACKGROUND] Error closing browser for ${auditId}:`, closeError);
      }
    }
  }
}