import { getAuditStatus, setAuditStatus } from './utils/auditStatusStore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { auditId } = req.body;

  if (!auditId) {
    return res.status(400).json({ error: 'auditId required' });
  }

  try {
    console.log(`[ADVANCE] Advancing progress for ${auditId}`);

    // Get current status
    const currentStatus = getAuditStatus(auditId);

    if (currentStatus.status === 'not-found') {
      // Initialize if not found
      setAuditStatus(auditId, {
        type: 'progress',
        message: 'Preparing browser...',
        progress: 10,
        stage: 'running',
        step: 0
      });
      return res.status(200).json({ success: true, message: 'Initialized' });
    }

    // If already complete, don't advance
    if (currentStatus.type === 'complete' || currentStatus.type === 'error') {
      return res.status(200).json({ success: true, message: 'Already complete' });
    }

    // Progress steps
    const steps = [
      { progress: 10, message: 'Preparing browser...', type: 'progress' },
      { progress: 25, message: 'Launching Chrome...', type: 'progress' },
      { progress: 40, message: 'Loading page...', type: 'progress' },
      { progress: 60, message: 'Running Lighthouse...', type: 'progress' },
      { progress: 80, message: 'Analyzing results...', type: 'progress' },
      { progress: 100, message: 'Audit completed!', type: 'complete' }
    ];

    // Get current step
    const currentStep = currentStatus.step || 0;
    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    const stepData = steps[nextStep];

    console.log(`[ADVANCE] ${auditId}: Advancing from step ${currentStep} to ${nextStep}`);

    // Set new status
    setAuditStatus(auditId, {
      type: stepData.type,
      message: stepData.message,
      progress: stepData.progress,
      stage: stepData.type === 'complete' ? 'complete' : 'running',
      step: nextStep,
      timestamp: new Date().toISOString(),
      ...(stepData.type === 'complete' && {
        data: {
          run: {
            scores: { performance: 85, accessibility: 92, bestPractices: 88, seo: 90 },
            metrics: { firstContentfulPaint: 1200, largestContentfulPaint: 2100 },
            url: 'https://example.com'
          }
        }
      })
    });

    res.status(200).json({
      success: true,
      message: `Advanced to step ${nextStep}`,
      progress: stepData.progress,
      complete: stepData.type === 'complete'
    });

  } catch (error) {
    console.error(`[ADVANCE] Error advancing ${auditId}:`, error);
    res.status(500).json({ error: error.message });
  }
}
