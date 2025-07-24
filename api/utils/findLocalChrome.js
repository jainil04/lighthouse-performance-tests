import fs from 'fs';

/**
 * Finds the path to a local Chrome or Chromium installation.
 * Throws an error if none is found.
 * @returns {string} The path to the Chrome executable
 */
export function findLocalChrome() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  throw new Error('No Chrome installation found. Please install Google Chrome or Chromium.');
}
