export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
    'Transfer-Encoding': 'chunked'
  });

  let counter = 0;
  const maxCount = 10;

  const sendUpdate = () => {
    const data = {
      type: 'progress',
      message: `Test update ${counter + 1}/${maxCount}`,
      progress: Math.round(((counter + 1) / maxCount) * 100),
      timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (res.flush) res.flush();
    if (res.flushHeaders) res.flushHeaders();

    counter++;

    if (counter < maxCount) {
      setTimeout(sendUpdate, 1000); // Send update every second
    } else {
      // Send completion
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        message: 'Test completed!',
        progress: 100,
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    }
  };

  // Start sending updates
  sendUpdate();
}
