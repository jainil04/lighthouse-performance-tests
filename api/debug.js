import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          VERCEL_ENV: process.env.VERCEL_ENV,
          VERCEL_REGION: process.env.VERCEL_REGION,
          AWS_REGION: process.env.AWS_REGION,
          AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
          AWS_LAMBDA_FUNCTION_MEMORY_SIZE: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
          PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
          PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH
        }
      },
      memory: {
        used: process.memoryUsage(),
        limit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || 'unknown',
        available: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE
          ? (parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE) - Math.round(process.memoryUsage().rss / 1024 / 1024))
          : 'unknown'
      },
      chromium: {
        version: chromium.version || 'unknown',
        args: chromium.args || [],
        headless: chromium.headless,
        defaultViewport: chromium.defaultViewport,
        executablePath: null,
        executablePathError: null
      },
      filesystem: {
        tmpDir: '/tmp',
        tmpDirExists: null,
        tmpDirWritable: null
      }
    };

    // Try to get Chromium executable path
    try {
      debugInfo.chromium.executablePath = await chromium.executablePath();
    } catch (error) {
      debugInfo.chromium.executablePathError = error.message;
    }

    // Check filesystem permissions
    try {
      const fs = await import('fs');
      debugInfo.filesystem.tmpDirExists = fs.existsSync('/tmp');
      if (debugInfo.filesystem.tmpDirExists) {
        try {
          fs.writeFileSync('/tmp/test-write.txt', 'test');
          fs.unlinkSync('/tmp/test-write.txt');
          debugInfo.filesystem.tmpDirWritable = true;
        } catch (writeError) {
          debugInfo.filesystem.tmpDirWritable = false;
          debugInfo.filesystem.writeError = writeError.message;
        }
      }
    } catch (fsError) {
      debugInfo.filesystem.error = fsError.message;
    }

    res.status(200).json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('Debug endpoint failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}