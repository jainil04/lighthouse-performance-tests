import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-core';

// Force English locale to prevent missing locale file errors
process.env.LC_ALL = 'en_US.UTF-8';
process.env.LANG = 'en_US.UTF-8';
process.env.LANGUAGE = 'en_US';
process.env.LIGHTHOUSE_LOCALE = 'en-US';

export default async function handler(req, res) {
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

  let browser;
  const startTime = Date.now();
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

  // Helper function to send progress updates
  function sendProgress(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    // Send initial progress
    sendProgress({
      type: 'progress',
      message: 'Initializing Lighthouse audit...',
      progress: 0,
      stage: 'initialization',
      timestamp: new Date().toISOString()
    });

    // Launch browser with environment-aware configuration
    let launchConfig;

    if (isProduction) {
      sendProgress({
        type: 'progress',
        message: 'Configuring Chrome for serverless environment...',
        progress: 10,
        stage: 'browser-setup',
        timestamp: new Date().toISOString()
      });

      const chromium = await import('@sparticuz/chromium');
      launchConfig = {
        args: [
          ...chromium.default.args,
          '--lang=en-US',
          '--accept-lang=en-US',
          '--hide-scrollbars',
          '--disable-web-security'
        ],
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
        ignoreHTTPSErrors: true,
        timeout: 30000,
        locale: 'en-US'
      };
    } else {
      sendProgress({
        type: 'progress',
        message: 'Configuring Chrome for local development...',
        progress: 10,
        stage: 'browser-setup',
        timestamp: new Date().toISOString()
      });

      // Find local Chrome installation
      const possiblePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ];

      let executablePath = null;
      const fs = await import('fs');

      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      }

      if (!executablePath) {
        throw new Error('No Chrome installation found. Please install Google Chrome or Chromium.');
      }

      launchConfig = {
        executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        timeout: 30000
      };
    }

    // Launch browser
    sendProgress({
      type: 'progress',
      message: 'Launching Chrome browser...',
      progress: 20,
      stage: 'browser-launch',
      timestamp: new Date().toISOString()
    });

    browser = await puppeteer.launch(launchConfig);
    const wsEndpoint = browser.wsEndpoint();

    sendProgress({
      type: 'progress',
      message: 'Chrome launched successfully, preparing Lighthouse...',
      progress: 30,
      stage: 'lighthouse-setup',
      timestamp: new Date().toISOString()
    });

    // Lighthouse configuration - exclude accessibility to avoid axe-core dependency
    const lighthouseConfig = {
      extends: 'lighthouse:default',
      settings: {
        locale: 'en-US',
        locales: ['en-US'], // Force only English locale
        onlyCategories: ['performance', 'best-practices', 'seo'], // Remove accessibility
        formFactor: device === 'mobile' ? 'mobile' : 'desktop',
        screenEmulation: device === 'mobile' ? {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        } : {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttling: throttle === 'none' ? {
          rttMs: 0,
          throughputKbps: 0,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        } : undefined,
        maxWaitForLoad: 45000,
        skipAudits: [
          'screenshot-thumbnails',
          'final-screenshot',
          'largest-contentful-paint-element',
          'layout-shift-elements',
          'full-page-screenshot',
          'mainthread-work-breakdown',
          // Skip all accessibility audits to avoid axe-core dependency
          'accesskeys',
          'aria-allowed-attr',
          'aria-hidden-body',
          'aria-hidden-focus',
          'aria-input-field-name',
          'aria-required-attr',
          'aria-required-children',
          'aria-required-parent',
          'aria-roles',
          'aria-toggle-field-name',
          'aria-valid-attr',
          'aria-valid-attr-value',
          'button-name',
          'bypass',
          'color-contrast',
          'definition-list',
          'dlitem',
          'document-title',
          'duplicate-id-active',
          'duplicate-id-aria',
          'form-field-multiple-labels',
          'frame-title',
          'heading-order',
          'html-has-lang',
          'html-lang-valid',
          'image-alt',
          'input-image-alt',
          'label',
          'link-name',
          'list',
          'listitem',
          'meta-refresh',
          'meta-viewport',
          'object-alt',
          'tabindex',
          'td-headers-attr',
          'th-has-data-cells',
          'valid-lang'
        ]
      }
    };

    // Run Lighthouse audit with progress updates
    sendProgress({
      type: 'progress',
      message: `Starting Lighthouse audit for ${url}...`,
      progress: 40,
      stage: 'audit-start',
      timestamp: new Date().toISOString()
    });

    const lighthouseOptions = {
      port: new URL(wsEndpoint).port,
      output: 'json',
      logLevel: 'error', // Reduce logging to avoid locale-related logs
      locale: 'en-US' // Force locale in options too
    };

    // Simulate progress during audit (since Lighthouse doesn't provide real-time progress)
    const progressInterval = setInterval(() => {
      sendProgress({
        type: 'progress',
        message: 'Running Lighthouse audit...',
        progress: 50 + Math.random() * 30, // Random progress between 50-80%
        stage: 'audit-running',
        timestamp: new Date().toISOString()
      });
    }, 2000);

    // Use minimal config or null to avoid config-related locale loading
    const { lhr } = await lighthouse(url, lighthouseOptions, null);

    clearInterval(progressInterval);

    sendProgress({
      type: 'progress',
      message: 'Lighthouse audit completed, processing results...',
      progress: 90,
      stage: 'processing',
      timestamp: new Date().toISOString()
    });

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Process results
    const auditResult = {
      success: true,
      url: lhr.finalUrl || url,
      device,
      throttle,
      runs,
      auditView,
      executionTime,
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      scores: {
        performance: Math.round((lhr.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lhr.categories.seo?.score || 0) * 100)
      },
      metrics: {
        firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue,
        largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue,
        firstMeaningfulPaint: lhr.audits['first-meaningful-paint']?.numericValue,
        speedIndex: lhr.audits['speed-index']?.numericValue,
        totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue,
        cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue
      },
      fullReport: auditView === 'detailed' ? lhr : null
    };

    sendProgress({
      type: 'progress',
      message: 'Audit complete!',
      progress: 100,
      stage: 'complete',
      timestamp: new Date().toISOString()
    });

    // Send final result
    sendProgress({
      type: 'complete',
      result: auditResult
    });

    res.end();

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Lighthouse streaming audit failed:', error);

    const errorData = {
      type: 'error',
      error: error.message,
      url,
      device,
      throttle,
      executionTime,
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      stack: error.stack
    };

    sendProgress(errorData);
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