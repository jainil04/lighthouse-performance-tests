import express from 'express';
import { runLighthouseAudit, runLighthouseAuditStream } from '../services/lighthouseService.js';
import { validateAuditRequest } from '../middleware/validation.js';

const router = express.Router();

// POST /api/lighthouse/audit/stream - Streaming endpoint with real-time progress
router.post('/audit/stream', validateAuditRequest, async (req, res) => {
  try {
    const { url, device, throttle, runs, auditView } = req.body;

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    console.log(`Starting streaming Lighthouse audit for: ${url}`);

    // Send initial status
    res.write(`data: ${JSON.stringify({
      type: 'start',
      message: 'Starting Lighthouse audit...',
      progress: 0,
      metadata: {
        url,
        device,
        throttle,
        runs: parseInt(runs),
        auditView,
        timestamp: new Date().toISOString()
      }
    })}\n\n`);
    res.flush(); // Force immediate sending

    // Progress callback function
    const onProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.flush(); // Force immediate sending of the data
    };

    // Run lighthouse audit with streaming
    const results = await runLighthouseAuditStream({
      url,
      device,
      throttle,
      runs: parseInt(runs),
      auditView,
      onProgress
    });

    // Send final results
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      message: 'Audit completed successfully!',
      progress: 100,
      data: results,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.flush(); // Force immediate sending

    res.end();

  } catch (error) {
    console.error('Streaming Lighthouse audit failed:', error);

    // Send error event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message,
      error: true,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.flush(); // Force immediate sending

    res.end();
  }
});

// POST /api/lighthouse/audit - Original non-streaming endpoint
router.post('/audit', validateAuditRequest, async (req, res) => {
  try {
    const { url, device, throttle, runs, auditView } = req.body;

    console.log(`Starting Lighthouse audit for: ${url}`);
    console.log(`Configuration: device=${device}, throttle=${throttle}, runs=${runs}, view=${auditView}`);

    const results = await runLighthouseAudit({
      url,
      device,
      throttle,
      runs: parseInt(runs),
      auditView
    });

    res.status(200).json({
      success: true,
      data: results,
      metadata: {
        url,
        device,
        throttle,
        runs: parseInt(runs),
        auditView,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Lighthouse audit failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/lighthouse/status
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Lighthouse service is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
