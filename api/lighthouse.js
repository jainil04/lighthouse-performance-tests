import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

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

      // --- Setup for chromium-min ---
      const packDir = '/tmp/chromium-pack';

      // Ensure the directory exists
      fs.mkdirSync(packDir, { recursive: true });

      // Create a minimal fonts.tar.br file (empty archive)
      const destFonts = path.join(packDir, 'fonts.tar.br');
      if (!fs.existsSync(destFonts)) {
        // Create a minimal tar.br file instead of copying (since file doesn't exist)
        fs.writeFileSync(destFonts, Buffer.alloc(0)); // Empty file
      }

      // Import chromium-min and decompression function
      const chromium = await import('@sparticuz/chromium-min');
      const { decompress } = await import('@sparticuz/chromium-min');

      // Decompress chromium binary (skip fonts since we don't have them)
      try {
        await decompress({
          cacheDir: packDir,
          url: 'https://github.com/Sparticuz/chromium/releases/download/v119.0.0/chromium-v119.0.0-pack.tar'
        });
      } catch (decompressError) {
        console.warn('Font decompression failed, continuing without fonts:', decompressError);
      }

      launchConfig = {
        args: [
          ...chromium.default.args,
          '--lang=en-US',
          '--accept-lang=en-US',
          '--hide-scrollbars',
          '--disable-web-security',
          '--disable-font-subpixel-positioning', // Disable advanced font features
          '--disable-features=VizDisplayCompositor' // Reduce font dependencies
        ],
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
        ignoreHTTPSErrors: true,
        timeout: 30000
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

      for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
          executablePath = chromePath;
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
          '--disable-renderer-backgrounding',
          '--lang=en-US',
          '--accept-lang=en-US'
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

    // Lighthouse configuration - minimal to avoid dependency issues
    const lighthouseConfig = {
      extends: 'lighthouse:default',
      settings: {
        locale: 'en-US',
        onlyCategories: ['performance', 'best-practices', 'seo'], // Remove accessibility to avoid axe-core
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
        maxWaitForLoad: 45000,
        skipAudits: [
          'screenshot-thumbnails',
          'final-screenshot',
          'largest-contentful-paint-element',
          'layout-shift-elements',
          'full-page-screenshot',
          'mainthread-work-breakdown'
        ]
      }
    };

    // Run Lighthouse audit
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
      logLevel: 'error'
    };

    // Progress simulation
    const progressInterval = setInterval(() => {
      sendProgress({
        type: 'progress',
        message: 'Running Lighthouse audit...',
        progress: 50 + Math.random() * 30,
        stage: 'audit-running',
        timestamp: new Date().toISOString()
      });
    }, 2000);

    const { lhr } = await lighthouse(url, lighthouseOptions, lighthouseConfig);

    clearInterval(progressInterval);

    // Process results
    const executionTime = Date.now() - startTime;
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
        accessibility: 0, // Set to 0 since we're not running accessibility audits
        bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lhr.categories.seo?.score || 0) * 100)
      },
      metrics: {
        firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue,
        largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue,
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

    sendProgress({
      type: 'complete',
      result: auditResult
    });

    res.end();

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Lighthouse streaming audit failed:', error);

    sendProgress({
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