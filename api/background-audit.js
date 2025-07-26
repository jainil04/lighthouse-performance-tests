import { setAuditStatus } from './utils/auditStatusStore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { auditId, url, device, throttle, runs, auditView } = req.body;

  if (!auditId) {
    return res.status(400).json({ error: 'auditId required' });
  }

  console.log(`[BACKGROUND] Starting background processing for ${auditId}`);

  // Send immediate response to avoid timeout
  res.status(200).json({ success: true, message: 'Background processing started' });

  // Run simulation asynchronously
  try {
    await simulateAuditProgress(auditId);
  } catch (error) {
    console.error(`[BACKGROUND] Simulation failed for ${auditId}:`, error);
    setAuditStatus(auditId, {
      type: 'error',
      message: `Background processing failed: ${error.message}`,
      error: true
    });
  }
}

// Simple audit progress simulation
async function simulateAuditProgress(auditId) {
  console.log(`[SIMULATION] Starting progress simulation for ${auditId}`);

  const steps = [
    { progress: 10, message: 'Preparing browser...', type: 'progress' },
    { progress: 25, message: 'Launching Chrome...', type: 'progress' },
    { progress: 40, message: 'Loading page...', type: 'progress' },
    { progress: 60, message: 'Running Lighthouse...', type: 'progress' },
    { progress: 80, message: 'Analyzing results...', type: 'progress' },
    { progress: 100, message: 'Audit completed!', type: 'complete' }
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`[SIMULATION] ${auditId}: ${step.message} (${step.progress}%)`);

    setAuditStatus(auditId, {
      type: step.type,
      message: step.message,
      progress: step.progress,
      stage: step.type === 'complete' ? 'complete' : 'running',
      timestamp: new Date().toISOString(),
      ...(step.type === 'complete' && {
        data: {
          run: {
            scores: { performance: 85, accessibility: 92, bestPractices: 88, seo: 90 },
            metrics: { firstContentfulPaint: 1200, largestContentfulPaint: 2100 },
            url: 'https://example.com'
          }
        }
      })
    });

    // Wait between steps (except for the last one)
    if (i < steps.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`[SIMULATION] Completed simulation for ${auditId}`);
}
