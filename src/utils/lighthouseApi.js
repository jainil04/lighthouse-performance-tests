export async function streamLighthouseAudit(auditConfig, onProgress) {
  try {
    console.log('Starting streaming audit with config:', auditConfig);

    const headers = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('lh_token')
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch("/api/lighthouse", {
      method: 'POST',
      headers,
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
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ') && line.length > 6) {
          try {
            const jsonData = line.slice(6).trim();
            if (jsonData) {
              const data = JSON.parse(jsonData);
              console.log('Received SSE data:', data);
              onProgress(data);

              if (data.type === 'error') {
                throw new Error(data.message);
              }
            }
          } catch (parseError) {
            if (parseError.message.includes('Failed to run Lighthouse audit')) {
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

    onProgress({
      type: 'error',
      message: error.message,
      error: true,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}
