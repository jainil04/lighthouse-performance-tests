export function validateAuditRequest(req, res, next) {
  const { url, device, throttle, runs, auditView } = req.body;

  // Validate URL
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL',
      message: 'URL is required and must be a valid string'
    });
  }

  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format',
      message: 'Please provide a valid URL (e.g., https://example.com)'
    });
  }

  // Validate device
  const validDevices = ['desktop', 'mobile'];
  if (device && !validDevices.includes(device)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid device',
      message: `Device must be one of: ${validDevices.join(', ')}`
    });
  }

  // Validate throttle
  const validThrottles = ['none', '3g', '4g', 'slow', 'fast'];
  if (throttle && !validThrottles.includes(throttle)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid throttle setting',
      message: `Throttle must be one of: ${validThrottles.join(', ')}`
    });
  }

  // Validate runs
  const runsNum = parseInt(runs);
  if (runs && (isNaN(runsNum) || runsNum < 1 || runsNum > 10)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid runs count',
      message: 'Runs must be a number between 1 and 10'
    });
  }

  // Validate audit view
  const validAuditViews = ['standard', 'full'];
  if (auditView && !validAuditViews.includes(auditView)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid audit view',
      message: `Audit view must be one of: ${validAuditViews.join(', ')}`
    });
  }

  next();
}
