// Simplified lighthouse API for debugging

export default async function handler(req, res) {
  console.log(`[LIGHTHOUSE] ${req.method} request received`);

  // Quick health check for GET requests
  if (req.method === 'GET') {
    console.log('[LIGHTHOUSE] Health check requested');
    return res.status(200).json({
      success: true,
      message: 'Lighthouse API is running',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    console.log('[LIGHTHOUSE] Invalid method:', req.method);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  const { url, device = 'desktop', throttle = 'none', runs = 1, auditView = 'standard', usePolling = false } = req.body;

  if (!url) {
    console.log('[LIGHTHOUSE] Missing URL');
    return res.status(400).json({
      success: false,
      error: 'URL is required',
      message: 'Please provide a valid URL to audit'
    });
  }

  // Generate unique audit ID
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[LIGHTHOUSE] Generated audit ID: ${auditId}`);

  // If polling mode, return audit ID immediately
  if (usePolling) {
    console.log(`[POLLING] Starting background audit ${auditId}`);

    // Send immediate response
    res.setHeader('X-Audit-ID', auditId);
    return res.status(200).json({
      success: true,
      auditId,
      message: 'Audit started in background, use polling to get updates'
    });
  }

  // For now, return a simple response for non-polling mode
  return res.status(200).json({
    success: true,
    message: 'Non-polling mode not implemented in debug version',
    auditId
  });
}
