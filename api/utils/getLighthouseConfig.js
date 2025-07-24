/**
 * Returns the Lighthouse configuration object based on device type.
 * @param {string} device - 'mobile' or 'desktop'
 * @returns {object} Lighthouse config
 */
export function getLighthouseConfig(device) {
  return {
    extends: 'lighthouse:default',
    settings: {
      locale: 'en-US',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], // Remove accessibility to avoid axe-core
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
}
