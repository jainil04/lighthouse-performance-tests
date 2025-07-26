// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Polling-based Lighthouse audit with real-time progress updates
 * This works reliably on Vercel where SSE gets buffered
 */
export async function streamLighthouseAudit(auditConfig, onProgress) {
  console.log('🚀 Starting polling-based audit with config:', auditConfig);

  let auditId = null;
  let pollingInterval = null;
  let isComplete = false;

  try {
    // Start the audit (this will run in background)
    const response = await fetch("/api/lighthouse", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...auditConfig,
        usePolling: true // Signal to use polling mode
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get audit ID from response
    auditId = response.headers.get('X-Audit-ID');

    if (!auditId) {
      // Fallback: try to get from response body
      const result = await response.json();
      auditId = result.auditId;
    }

    console.log('📝 Audit ID:', auditId);

    if (!auditId) {
      throw new Error('No audit ID received from server');
    }

    // Send initial start message
    onProgress({
      type: 'start',
      message: 'Audit started, polling for updates...',
      progress: 0,
      stage: 'starting',
      timestamp: new Date().toISOString()
    });

    // Start polling for progress updates
    let lastStatus = null;
    pollingInterval = setInterval(async () => {
      try {
        console.log('🔄 Polling for status update...');

        // First, try to advance the progress
        let advanceResult = null;
        try {
          const advanceResponse = await fetch('/api/advance-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auditId })
          });

          if (advanceResponse.ok) {
            advanceResult = await advanceResponse.json();
            console.log('⬆️ Progress advanced:', advanceResult);
          }
        } catch (advanceError) {
          console.warn('⚠️ Progress advance failed:', advanceError);
        }

        // Then get the current status
        const statusResponse = await fetch(`/api/audit-status?auditId=${auditId}`);

        if (!statusResponse.ok) {
          console.warn('⚠️ Status fetch failed:', statusResponse.status);
          return;
        }

        const status = await statusResponse.json();
        console.log('📊 Received status:', status);

        if (status.status === 'not-found') {
          console.log('⏳ Audit not started yet, continuing to poll...');
          return;
        }

        // Only send update if status changed (use timestamp as unique key)
        const statusKey = `${status.type}-${status.progress}-${status.timestamp}`;
        if (lastStatus !== statusKey) {
          lastStatus = statusKey;
          onProgress(status);
          console.log('📢 Sent progress update:', status.message, status.progress + '%');
        } else {
          console.log('🔄 Status unchanged, skipping update');
        }

        // Stop polling when complete
        if (status.type === 'complete' || status.type === 'error') {
          console.log('✅ Audit completed, stopping polling');
          isComplete = true;
          clearInterval(pollingInterval);
          pollingInterval = null;

          if (status.type === 'error') {
            throw new Error(status.message);
          }
        }
      } catch (pollError) {
        console.error('❌ Polling error:', pollError);

        // Don't stop polling for network errors, but stop for other errors
        if (!pollError.message.includes('fetch')) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          throw pollError;
        }
      }
    }, 800); // Poll every 800ms for smooth updates

    // Wait for completion or timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!isComplete) {
          clearInterval(pollingInterval);
          reject(new Error('Audit timed out after 5 minutes'));
        }
      }, 5 * 60 * 1000); // 5 minute timeout

      const checkComplete = setInterval(() => {
        if (isComplete) {
          clearInterval(checkComplete);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });

  } catch (error) {
    console.error('❌ Audit error:', error);

    // Cleanup
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }

    // Send error to progress callback
    onProgress({
      type: 'error',
      message: error.message,
      error: true,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}

/**
 * Regular (non-streaming) Lighthouse audit
 * @param {Object} auditConfig - Audit configuration
 * @returns {Promise} - Audit results
 */
export async function runLighthouseAudit(auditConfig) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/lighthouse/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(auditConfig)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Audit error:', error);
    throw error;
  }
}

/**
 * Check Lighthouse service status
 * @returns {Promise} - Service status
 */
export async function checkLighthouseStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/lighthouse/status`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
}

/**
 * Check backend health
 * @returns {Promise} - Health status
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}
