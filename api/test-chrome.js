import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are allowed'
    });
  }

  let browser;
  const startTime = Date.now();
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

  try {
    let launchConfig;

    if (isProduction) {
      // Production/Vercel configuration
      const chromium = await import('@sparticuz/chromium');
      launchConfig = {
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
        ignoreHTTPSErrors: true,
        timeout: 30000
      };
    } else {
      // Local development configuration
      // Try to find local Chrome installation
      const possiblePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
        '/Applications/Chromium.app/Contents/MacOS/Chromium', // macOS Chromium
        '/usr/bin/google-chrome-stable', // Linux
        '/usr/bin/google-chrome', // Linux
        '/usr/bin/chromium-browser', // Linux
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' // Windows 32-bit
      ];

      let executablePath = null;

      // Check which Chrome executable exists
      for (const path of possiblePaths) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(path)) {
            executablePath = path;
            break;
          }
        } catch (error) {
          // Continue to next path
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

    const testInfo = {
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      platform: process.platform,
      launchConfig: {
        executablePath: launchConfig.executablePath,
        args: launchConfig.args,
        headless: launchConfig.headless
      },
      test: {
        startTime: startTime,
        steps: []
      }
    };

    // Step 1: Launch Chrome
    testInfo.test.steps.push({
      step: 1,
      action: 'Launching Chrome browser...',
      timestamp: Date.now() - startTime
    });

    browser = await puppeteer.launch(launchConfig);

    testInfo.test.steps.push({
      step: 2,
      action: 'Chrome launched successfully',
      timestamp: Date.now() - startTime,
      wsEndpoint: browser.wsEndpoint()
    });

    // Step 2: Create a new page
    const page = await browser.newPage();

    testInfo.test.steps.push({
      step: 3,
      action: 'New page created',
      timestamp: Date.now() - startTime
    });

    // Step 3: Navigate to a test URL
    await page.goto('https://example.com', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    const title = await page.title();
    const url = page.url();

    testInfo.test.steps.push({
      step: 4,
      action: 'Navigation completed',
      timestamp: Date.now() - startTime,
      pageTitle: title,
      finalUrl: url
    });

    // Step 4: Get some basic page info
    const viewport = page.viewport();
    const userAgent = await page.evaluate(() => navigator.userAgent);

    testInfo.test.steps.push({
      step: 5,
      action: 'Page information gathered',
      timestamp: Date.now() - startTime,
      viewport: viewport,
      userAgent: userAgent
    });

    const endTime = Date.now();
    testInfo.test.totalTime = endTime - startTime;
    testInfo.test.endTime = endTime;

    res.status(200).json({
      success: true,
      message: 'Chrome test completed successfully',
      data: testInfo
    });

  } catch (error) {
    const errorTime = Date.now();
    console.error('Chrome test failed:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      testDuration: errorTime - startTime,
      errorTime: errorTime - startTime,
      environment: isProduction ? 'production' : 'development',
      platform: process.platform
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