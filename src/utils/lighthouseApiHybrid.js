// Hybrid streaming with SSE + polling fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hybrid Lighthouse audit with real-time progress updates
 * Uses SSE primarily, falls back to polling if SSE is buffered
 */
export async function streamLighthouseAuditHybrid(auditConfig, onProgress) {
  console.log('🚀 Starting hybrid streaming audit with config:', auditConfig);

  let auditId = null;
  let pollingInterval = null;
  let lastProgressTime = Date.now();
  let isSSEWorking = false;

  try {
    const response = await fetch("/api/lighthouse", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(auditConfig)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get audit ID from response headers for polling fallback
    auditId = response.headers.get('X-Audit-ID');
    console.log('📝 Audit ID:', auditId);

    console.log('📡 Response received, starting to read stream...');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let messageCount = 0;

    // Start polling fallback after 3 seconds if no real-time messages
    const pollingFallback = setTimeout(() => {
      if (!isSSEWorking && auditId) {
        console.log('⏰ SSE appears buffered, switching to polling fallback');
        startPolling();
      }
    }, 3000);

    const startPolling = () => {
      if (pollingInterval || !auditId) return;

      console.log('🔄 Starting polling fallback');
      pollingInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/audit-status?auditId=${auditId}`);
          const status = await statusResponse.json();

          if (status.status !== 'not-found') {
            console.log('📊 Polling update:', status);
            onProgress(status);

            if (status.type === 'complete' || status.type === 'error') {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          }
        } catch (pollError) {
          console.error('❌ Polling error:', pollError);
        }
      }, 1000); // Poll every second
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('✅ Stream reading completed');
        break;
      }

      const chunk = decoder.decode(value);
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ') && line.length > 6) {
          try {
            const jsonData = line.slice(6).trim();
            if (jsonData) {
              const data = JSON.parse(jsonData);

              messageCount++;
              const now = Date.now();
              const timeSinceLastMessage = now - lastProgressTime;
              lastProgressTime = now;

              // If we get messages quickly, SSE is working
              if (timeSinceLastMessage < 5000) {
                isSSEWorking = true;
                clearTimeout(pollingFallback);

                // Stop polling if we switched to it
                if (pollingInterval) {
                  console.log('🔄 SSE working again, stopping polling');
                  clearInterval(pollingInterval);
                  pollingInterval = null;
                }
              }

              console.log(`✅ SSE message #${messageCount} (${timeSinceLastMessage}ms since last):`, data);
              onProgress(data);

              if (data.type === 'error') {
                throw new Error(data.message);
              }

              if (data.type === 'complete') {
                break;
              }
            }
          } catch (parseError) {
            if (parseError.message.includes('Failed to run Lighthouse audit')) {
              throw parseError;
            }
            console.warn('⚠️ Failed to parse SSE data:', line, parseError);
          }
        } else if (line.trim()) {
          console.log('🔍 Non-SSE line received:', line);
        }
      }
    }

    // Cleanup
    clearTimeout(pollingFallback);
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

  } catch (error) {
    console.error('❌ Stream error:', error);

    // Cleanup
    if (pollingInterval) {
      clearInterval(pollingInterval);
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
