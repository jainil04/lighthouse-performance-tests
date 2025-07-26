import { setAuditStatus, getAuditStatus } from './utils/auditStatusStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[TEST] Testing audit status store...');

    // Test setting a status
    const testId = 'test_' + Date.now();
    setAuditStatus(testId, {
      type: 'start',
      message: 'Test audit started',
      progress: 0
    });

    // Test getting the status
    const status = getAuditStatus(testId);

    res.status(200).json({
      success: true,
      testId,
      status,
      message: 'Store test completed'
    });

  } catch (error) {
    console.error('[TEST] Store test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
