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

  const { url, device = 'desktop', throttle = 'none' } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required',
      message: 'Please provide a valid URL to audit'
    });
  }

  let browser;
  const startTime = Date.now();
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

  try {
    // Launch browser with environment-aware configuration
    let launchConfig;

    if (isProduction) {
      const chromium = await import('@sparticuz/chromium-min');
      launchConfig = {
        args: [
          ...chromium.default.args,
          '--lang=en-US',
          '--accept-lang=en-US',
          '--hide-scrollbars',
          '--disable-web-security'
        ],
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v119.0.0/chromium-v119.0.0-pack.tar'
        ),
        headless: chromium.default.headless,
        ignoreHTTPSErrors: true,
        timeout: 30000,
        locale: 'en-US'
      };
    } else {
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
    browser = await puppeteer.launch(launchConfig);
    const wsEndpoint = browser.wsEndpoint();

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

    // Run Lighthouse audit with minimal config to avoid locale issues
    const lighthouseOptions = {
      port: new URL(wsEndpoint).port,
      output: 'json',
      logLevel: 'error', // Reduce logging to avoid locale-related logs
      locale: 'en-US' // Force locale in options too
    };

    // Use minimal config or null to avoid config-related locale loading
    const { lhr } = await lighthouse(url, lighthouseOptions, null);

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Process results
    const auditResult = {
      success: true,
      url: lhr.finalUrl || url,
      device,
      throttle,
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
      fullReport: lhr
    };

    res.status(200).json(auditResult);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Lighthouse audit failed:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      url,
      device,
      throttle,
      executionTime,
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      stack: error.stack
    });
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
