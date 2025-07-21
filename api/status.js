export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    const memoryUsage = process.memoryUsage();

    const status = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV || 'development',
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV || 'development'
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)} MB`,
        limit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || 'unknown'
      },
      uptime: {
        seconds: process.uptime(),
        formatted: formatUptime(process.uptime())
      },
      performance: {
        processCpuUsage: process.cpuUsage(),
        hrtime: process.hrtime()
      }
    };

    res.status(200).json(status);
  } catch (error) {
    console.error('Status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to format uptime
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}