// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Stream Lighthouse audit with real-time progress updates
 * @param {Object} auditConfig - Audit configuration
 * @param {string} auditConfig.url - URL to audit
 * @param {string} auditConfig.device - Device type ('desktop' or 'mobile')
 * @param {string} auditConfig.throttle - Network throttling ('none', '3g', '4g', 'slow', 'fast')
 * @param {number} auditConfig.runs - Number of runs (1-10)
 * @param {string} auditConfig.auditView - Audit view ('standard' or 'full')
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise} - Resolves when audit completes
 */
export async function streamLighthouseAudit(auditConfig, onProgress) {
  try {
    console.log('Starting streaming audit with config:', auditConfig);

    const response = await fetch(`${API_BASE_URL}/api/lighthouse/audit/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(auditConfig)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Response received, starting to read stream...');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      buffer += chunk;

      const lines = buffer.split('\n');
      // Keep the last incomplete line in the buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ') && line.length > 6) {
          try {
            const jsonData = line.slice(6).trim();
            if (jsonData) {
              const data = JSON.parse(jsonData);
              console.log('Received SSE data:', data);
              onProgress(data);

              // If it's an error, throw to be caught by caller
              if (data.type === 'error') {
                throw new Error(data.message);
              }
            }
          } catch (parseError) {
            if (parseError.message.includes('Failed to run Lighthouse audit')) {
              // Re-throw lighthouse errors
              throw parseError;
            }
            console.warn('Failed to parse SSE data:', line, parseError);
          }
        }
      }
    }

    console.log('Stream reading completed');
  } catch (error) {
    console.error('Stream error:', error);

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
