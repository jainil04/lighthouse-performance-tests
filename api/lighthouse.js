import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { getLaunchConfig } from './utils/getLaunchConfig.js';
import { getLighthouseConfig } from './utils/getLighthouseConfig.js';

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
  // console.log("*** request received ***", JSON.stringify(JSON.parse(req.body)));
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
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

    globalProgress = Math.max(globalProgress, 25);

    // Multiple runs support
    const runResults = [];
    for (let i = 0; i < runs; i++) {
      const progressPerRun = 70 / runs; // 70% total for all runs
      const baseProgressForRun = 25 + (i * progressPerRun); // Start after browser setup
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
      globalProgress = 100;
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