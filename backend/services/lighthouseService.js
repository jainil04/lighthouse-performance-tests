import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const THROTTLE_CONFIGS = {
  none: null,
  '3g': 'mobileSlow4G',
  '4g': 'mobile4G',
  slow: 'mobileSlow4G',
  fast: 'mobile4G'
};

const DEVICE_CONFIGS = {
  desktop: {
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  mobile: {
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false,
    },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  }
};

// Streaming version with progress updates
export async function runLighthouseAuditStream({ url, device = 'desktop', throttle = 'none', runs = 1, auditView = 'standard', onProgress }) {
  let chrome;

  try {
    // Validate URL
    new URL(url);

    // Send Chrome launch progress
    onProgress({
      type: 'progress',
      message: 'Launching Chrome browser...',
      progress: 0,
      stage: 'initialization'
    });

    // Clear any existing performance marks to avoid conflicts
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
    }

    // Launch Chrome in headless mode with better isolation
    chrome = await launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-software-rasterizer',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--no-pings',
        '--disable-client-side-phishing-detection'
      ],
      handleSIGINT: false,
      port: 0, // Let chrome-launcher choose an available port
      userDataDir: false // Use a temporary user data directory for better isolation
    });

    // Give Chrome more time to fully initialize and stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Chrome launched on port:', chrome.port);

    onProgress({
      type: 'progress',
      message: 'Chrome browser launched successfully',
      progress: 0,
      stage: 'chrome-ready'
    });

    const results = [];

    // Run lighthouse multiple times if specified
    for (let i = 0; i < runs; i++) {
      // Calculate progress: Simple division - each run gets (100 / totalRuns) percent
      const progressPerRun = 100 / runs;
      const runStartProgress = Math.round(i * progressPerRun);

      onProgress({
        type: 'progress',
        message: `Running audit ${i + 1}/${runs} for ${url}`,
        progress: runStartProgress,
        stage: 'audit',
        currentRun: i + 1,
        totalRuns: runs
      });

      console.log(`[PROGRESS] Starting run ${i + 1}/${runs} - Progress: ${runStartProgress}%`);

      console.log(`Running audit ${i + 1}/${runs} for ${url}`);

      const options = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: auditView === 'standard'
          ? ['performance', 'accessibility', 'best-practices', 'seo']
          : null,
        port: chrome.port,
        formFactor: DEVICE_CONFIGS[device].formFactor,
        screenEmulation: DEVICE_CONFIGS[device].screenEmulation,
        emulatedUserAgent: DEVICE_CONFIGS[device].userAgent
      };

      // Add throttling only if not 'none'
      if (throttle !== 'none' && THROTTLE_CONFIGS[throttle]) {
        options.throttling = THROTTLE_CONFIGS[throttle];
      }

      // Send audit start for this run - keep progress at run start
      onProgress({
        type: 'progress',
        message: `Analyzing ${url}... (Run ${i + 1}/${runs})`,
        progress: runStartProgress,
        stage: 'analyzing',
        currentRun: i + 1,
        totalRuns: runs
      });

      const runnerResult = await lighthouse(url, options);

      if (!runnerResult || !runnerResult.lhr) {
        throw new Error('Failed to get Lighthouse results');
      }

      // Extract scores and key metrics
      const scores = {
        performance: Math.round(runnerResult.lhr.categories.performance?.score * 100) || 0,
        accessibility: Math.round(runnerResult.lhr.categories.accessibility?.score * 100) || 0,
        bestPractices: Math.round(runnerResult.lhr.categories['best-practices']?.score * 100) || 0,
        seo: Math.round(runnerResult.lhr.categories.seo?.score * 100) || 0
      };

      // Extract comprehensive metrics
      const metrics = {
        // Core Web Vitals
        firstContentfulPaint: runnerResult.lhr.audits['first-contentful-paint']?.numericValue || 0,
        largestContentfulPaint: runnerResult.lhr.audits['largest-contentful-paint']?.numericValue || 0,
        speedIndex: runnerResult.lhr.audits['speed-index']?.numericValue || 0,
        totalBlockingTime: runnerResult.lhr.audits['total-blocking-time']?.numericValue || 0,
        cumulativeLayoutShift: runnerResult.lhr.audits['cumulative-layout-shift']?.numericValue || 0,

        // Additional Performance Metrics
        firstMeaningfulPaint: runnerResult.lhr.audits['first-meaningful-paint']?.numericValue || 0,
        timeToInteractive: runnerResult.lhr.audits['interactive']?.numericValue || 0,
        maxPotentialFirstInputDelay: runnerResult.lhr.audits['max-potential-fid']?.numericValue || 0,

        // Network & Resource Metrics
        serverResponseTime: runnerResult.lhr.audits['server-response-time']?.numericValue || 0,
        mainThreadWork: runnerResult.lhr.audits['mainthread-work-breakdown']?.numericValue || 0,
        bootupTime: runnerResult.lhr.audits['bootup-time']?.numericValue || 0,

        // Resource Metrics
        totalByteWeight: runnerResult.lhr.audits['total-byte-weight']?.numericValue || 0,
        unusedJavascript: runnerResult.lhr.audits['unused-javascript']?.numericValue || 0,
        unusedCssRules: runnerResult.lhr.audits['unused-css-rules']?.numericValue || 0,

        // Image Optimization
        unoptimizedImages: runnerResult.lhr.audits['unoptimized-images']?.numericValue || 0,
        modernImageFormats: runnerResult.lhr.audits['modern-image-formats']?.numericValue || 0,
        efficientAnimatedContent: runnerResult.lhr.audits['efficient-animated-content']?.numericValue || 0,

        // Additional Opportunities
        renderBlockingResources: runnerResult.lhr.audits['render-blocking-resources']?.numericValue || 0,
        duplicatedJavascript: runnerResult.lhr.audits['duplicated-javascript']?.numericValue || 0,
        legacyJavascript: runnerResult.lhr.audits['legacy-javascript']?.numericValue || 0
      };

      // Extract opportunities (potential savings)
      const opportunities = {};
      Object.keys(runnerResult.lhr.audits).forEach(auditKey => {
        const audit = runnerResult.lhr.audits[auditKey];
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
      Object.keys(runnerResult.lhr.audits).forEach(auditKey => {
        const audit = runnerResult.lhr.audits[auditKey];
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

      const result = {
        run: i + 1,
        scores,
        metrics,
        opportunities,
        diagnostics,
        timestamp: new Date().toISOString(),
        url: runnerResult.lhr.finalUrl,
        ...(auditView === 'full' && {
          fullReport: {
            categories: runnerResult.lhr.categories,
            audits: runnerResult.lhr.audits,
            configSettings: runnerResult.lhr.configSettings
          }
        })
      };

      results.push(result);

      // Send completion update for this run with correct progress
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

    // Send processing final results
    onProgress({
      type: 'progress',
      message: 'Processing final results...',
      progress: 100,
      stage: 'finalizing'
    });

    // Calculate averages if multiple runs
    if (runs > 1) {
      const averages = calculateAverages(results);
      return {
        runs: results,
        averages,
        summary: {
          totalRuns: runs,
          url,
          device,
          throttle,
          auditView
        }
      };
    }

    return {
      run: results[0],
      summary: {
        totalRuns: 1,
        url,
        device,
        throttle,
        auditView
      }
    };

  } catch (error) {
    console.error('Lighthouse audit error:', error);

    onProgress({
      type: 'error',
      message: `Failed to run Lighthouse audit: ${error.message}`,
      error: true,
      stage: 'error'
    });

    throw new Error(`Failed to run Lighthouse audit: ${error.message}`);
  } finally {
    if (chrome) {
      try {
        onProgress({
          type: 'progress',
          message: 'Cleaning up Chrome browser...',
          progress: 98,
          stage: 'cleanup'
        });

        // Kill Chrome process and clean up
        await chrome.kill();

        // Clear performance marks after cleanup
        if (typeof performance !== 'undefined' && performance.clearMarks) {
          performance.clearMarks();
        }
      } catch (killError) {
        console.warn('Error killing Chrome process:', killError);
      }
    }
  }
}

// Original non-streaming function (kept for backward compatibility)
export async function runLighthouseAudit({ url, device = 'desktop', throttle = 'none', runs = 1, auditView = 'standard' }) {
  let chrome;

  try {
    // Validate URL
    new URL(url);

    // Clear any existing performance marks to avoid conflicts
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
    }

    // Launch Chrome in headless mode with better isolation
    chrome = await launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-software-rasterizer',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--no-pings',
        '--disable-client-side-phishing-detection'
      ],
      handleSIGINT: false,
      port: 0, // Let chrome-launcher choose an available port
      userDataDir: false // Use a temporary user data directory for better isolation
    });

    // Give Chrome more time to fully initialize and stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Chrome launched on port:', chrome.port);

    const results = [];

    // Run lighthouse multiple times if specified
    for (let i = 0; i < runs; i++) {
      console.log(`Running audit ${i + 1}/${runs} for ${url}`);

      const options = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: auditView === 'standard'
          ? ['performance', 'accessibility', 'best-practices', 'seo']
          : null, // null means all categories
        port: chrome.port,
        formFactor: DEVICE_CONFIGS[device].formFactor,
        screenEmulation: DEVICE_CONFIGS[device].screenEmulation,
        emulatedUserAgent: DEVICE_CONFIGS[device].userAgent
      };

      // Add throttling only if not 'none'
      if (throttle !== 'none' && THROTTLE_CONFIGS[throttle]) {
        options.throttling = THROTTLE_CONFIGS[throttle];
      }

      const runnerResult = await lighthouse(url, options);

      if (!runnerResult || !runnerResult.lhr) {
        throw new Error('Failed to get Lighthouse results');
      }

      // Extract scores and key metrics
      const scores = {
        performance: Math.round(runnerResult.lhr.categories.performance?.score * 100) || 0,
        accessibility: Math.round(runnerResult.lhr.categories.accessibility?.score * 100) || 0,
        bestPractices: Math.round(runnerResult.lhr.categories['best-practices']?.score * 100) || 0,
        seo: Math.round(runnerResult.lhr.categories.seo?.score * 100) || 0
      };

      // Extract comprehensive metrics
      const metrics = {
        // Core Web Vitals
        firstContentfulPaint: runnerResult.lhr.audits['first-contentful-paint']?.numericValue || 0,
        largestContentfulPaint: runnerResult.lhr.audits['largest-contentful-paint']?.numericValue || 0,
        speedIndex: runnerResult.lhr.audits['speed-index']?.numericValue || 0,
        totalBlockingTime: runnerResult.lhr.audits['total-blocking-time']?.numericValue || 0,
        cumulativeLayoutShift: runnerResult.lhr.audits['cumulative-layout-shift']?.numericValue || 0,

        // Additional Performance Metrics
        firstMeaningfulPaint: runnerResult.lhr.audits['first-meaningful-paint']?.numericValue || 0,
        timeToInteractive: runnerResult.lhr.audits['interactive']?.numericValue || 0,
        maxPotentialFirstInputDelay: runnerResult.lhr.audits['max-potential-fid']?.numericValue || 0,

        // Network & Resource Metrics
        serverResponseTime: runnerResult.lhr.audits['server-response-time']?.numericValue || 0,
        mainThreadWork: runnerResult.lhr.audits['mainthread-work-breakdown']?.numericValue || 0,
        bootupTime: runnerResult.lhr.audits['bootup-time']?.numericValue || 0,

        // Resource Metrics
        totalByteWeight: runnerResult.lhr.audits['total-byte-weight']?.numericValue || 0,
        unusedJavascript: runnerResult.lhr.audits['unused-javascript']?.numericValue || 0,
        unusedCssRules: runnerResult.lhr.audits['unused-css-rules']?.numericValue || 0,

        // Image Optimization
        unoptimizedImages: runnerResult.lhr.audits['unoptimized-images']?.numericValue || 0,
        modernImageFormats: runnerResult.lhr.audits['modern-image-formats']?.numericValue || 0,
        efficientAnimatedContent: runnerResult.lhr.audits['efficient-animated-content']?.numericValue || 0,

        // Additional Opportunities
        renderBlockingResources: runnerResult.lhr.audits['render-blocking-resources']?.numericValue || 0,
        duplicatedJavascript: runnerResult.lhr.audits['duplicated-javascript']?.numericValue || 0,
        legacyJavascript: runnerResult.lhr.audits['legacy-javascript']?.numericValue || 0
      };

      // Extract opportunities (potential savings)
      const opportunities = {};
      Object.keys(runnerResult.lhr.audits).forEach(auditKey => {
        const audit = runnerResult.lhr.audits[auditKey];
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
      Object.keys(runnerResult.lhr.audits).forEach(auditKey => {
        const audit = runnerResult.lhr.audits[auditKey];
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

      const result = {
        run: i + 1,
        scores,
        metrics,
        opportunities,
        diagnostics,
        timestamp: new Date().toISOString(),
        url: runnerResult.lhr.finalUrl,
        ...(auditView === 'full' && {
          fullReport: {
            categories: runnerResult.lhr.categories,
            audits: runnerResult.lhr.audits,
            configSettings: runnerResult.lhr.configSettings
          }
        })
      };

      results.push(result);
    }

    // Calculate averages if multiple runs
    if (runs > 1) {
      const averages = calculateAverages(results);
      return {
        runs: results,
        averages,
        summary: {
          totalRuns: runs,
          url,
          device,
          throttle,
          auditView
        }
      };
    }

    return {
      run: results[0],
      summary: {
        totalRuns: 1,
        url,
        device,
        throttle,
        auditView
      }
    };

  } catch (error) {
    console.error('Lighthouse audit error:', error);
    throw new Error(`Failed to run Lighthouse audit: ${error.message}`);
  } finally {
    if (chrome) {
      try {
        await chrome.kill();

        // Clear performance marks after cleanup
        if (typeof performance !== 'undefined' && performance.clearMarks) {
          performance.clearMarks();
        }
      } catch (killError) {
        console.warn('Error killing Chrome process:', killError);
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
