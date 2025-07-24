import { findLocalChrome } from './findLocalChrome.js';

/**
 * Returns the Puppeteer launch configuration based on environment.
 * @param {boolean} isProduction - Whether running in production/serverless
 * @returns {Promise<object>} Puppeteer launch config
 */
export async function getLaunchConfig(isProduction) {
  if (isProduction) {
    const chromium = await import('@sparticuz/chromium');
    return {
      args: [
        ...chromium.default.args,
        '--lang=en-US',
        '--accept-lang=en-US',
        '--hide-scrollbars',
        '--disable-web-security',
        '--disable-font-subpixel-positioning',
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
      ignoreHTTPSErrors: true,
      timeout: 30000
    };
  } else {
    const executablePath = findLocalChrome();
    return {
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
}
