# Streaming API Usage Examples

## Server-Sent Events (SSE) Endpoint

### Endpoint
```
POST /api/lighthouse/audit/stream
```

### Request Body
```json
{
  "url": "https://example.com",
  "device": "desktop",
  "throttle": "none",
  "runs": 3,
  "auditView": "standard"
}
```

## Frontend Integration Example

### JavaScript (Native EventSource)
```javascript
async function runStreamingAudit(auditConfig) {
  // First, make a POST request to start the audit
  const response = await fetch('/api/lighthouse/audit/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(auditConfig)
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          handleProgressUpdate(data);
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
  }
}

function handleProgressUpdate(data) {
  switch (data.type) {
    case 'start':
      console.log('Audit started:', data.message);
      updateProgressBar(data.progress);
      break;

    case 'progress':
      console.log(`Progress: ${data.progress}% - ${data.message}`);
      updateProgressBar(data.progress);
      updateStage(data.stage);
      break;

    case 'run-complete':
      console.log(`Run ${data.currentRun}/${data.totalRuns} completed`);
      updateProgressBar(data.progress);
      displayRunResult(data.runResult);
      break;

    case 'complete':
      console.log('Audit completed!', data.data);
      updateProgressBar(100);
      displayFinalResults(data.data);
      break;

    case 'error':
      console.error('Audit error:', data.message);
      showError(data.message);
      break;
  }
}
```

### Vue.js Integration Example
```javascript
// In your Vue component
export default {
  data() {
    return {
      isRunning: false,
      progress: 0,
      currentStage: '',
      currentMessage: '',
      results: null,
      error: null
    }
  },

  methods: {
    async startStreamingAudit(auditConfig) {
      this.isRunning = true;
      this.progress = 0;
      this.error = null;
      this.results = null;

      try {
        const response = await fetch('/api/lighthouse/audit/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(auditConfig)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              this.handleProgressUpdate(data);
            }
          }
        }
      } catch (error) {
        this.error = error.message;
        console.error('Stream error:', error);
      } finally {
        this.isRunning = false;
      }
    },

    handleProgressUpdate(data) {
      this.progress = data.progress || 0;
      this.currentMessage = data.message || '';
      this.currentStage = data.stage || '';

      switch (data.type) {
        case 'complete':
          this.results = data.data;
          break;
        case 'error':
          this.error = data.message;
          break;
        case 'run-complete':
          // Update scores in real-time as each run completes
          if (data.runResult) {
            this.updateScores(data.runResult.scores);
          }
          break;
      }
    },

    updateScores(newScores) {
      // Update your ScoreCards component with new scores
      this.scores = { ...newScores };
    }
  }
}
```

## Event Types

### `start`
- Sent when audit begins
- Contains initial metadata

### `progress`
- Sent during various stages
- Contains progress percentage and current message
- Stages: `initialization`, `chrome-ready`, `audit`, `analyzing`, `finalizing`, `cleanup`

### `run-complete`
- Sent when each individual run completes
- Contains scores and metrics for that run
- Useful for updating UI with incremental results

### `complete`
- Sent when all runs are finished
- Contains final aggregated results

### `error`
- Sent if any error occurs
- Contains error message and details

## Progress Stages

1. **initialization** (0-10%): Starting up, launching Chrome
2. **chrome-ready** (10%): Chrome browser ready
3. **audit** (10-90%): Running individual audits
4. **analyzing** (per run): Analyzing website performance
5. **run-complete** (per run): Individual run completed
6. **finalizing** (90-95%): Processing final results
7. **cleanup** (95-98%): Cleaning up resources
8. **complete** (100%): All done!

## Benefits

- **Real-time feedback**: Users see progress as it happens
- **Better UX**: No waiting with blank screen
- **Run-by-run updates**: See results from each run immediately
- **Error handling**: Immediate feedback if something goes wrong
- **Cancellation support**: Can be extended to support cancelling long-running audits
