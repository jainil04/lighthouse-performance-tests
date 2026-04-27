# api/CLAUDE.md

Vercel serverless functions. Each file exports one default handler. Route-to-file mapping is in `vercel.json` — adding a file is not enough, you must also add a route entry.

## Handler signature

```js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  // ...
}
```

## SSE — event format

`lighthouse.js` uses a single POST response as an SSE stream. Format is strict — do not deviate:

```
data: {"type":"<type>","progress":<0-100>,...}\n\n
```

Every SSE event must have `type`. Write and flush immediately — do not buffer:

```js
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*'
})

const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
```

### Event schema

| `type` | When | Required fields |
|--------|------|-----------------|
| `start` | audit begins | `message`, `progress: 0`, `metadata: {url, device, throttle, runs, auditView}` |
| `progress` | browser/Lighthouse stages | `message`, `progress`, `stage` |
| `run-complete` | each run finishes | `currentRun`, `totalRuns`, `runResult: {scores, metrics, opportunities, diagnostics}` |
| `complete` | all runs done | `data.run` (single) or `data.runs[] + data.averages` (multi) |
| `error` | any failure | `error: true`, `message`, `stack` |

Rules:
- Progress is **monotonically increasing** — never send a value lower than the previous one
- Always call `res.end()` after `complete` or `error`
- `fullReport: {categories, audits, configSettings}` is appended to each run result only when `auditView === 'full'`

## Chrome / Puppeteer

Use `puppeteer-core` + `@sparticuz/chromium` **only**. Never use `chrome-launcher` here (that belongs in `/backend`).

```js
const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production'
const launchConfig = await getLaunchConfig(isProduction)  // from utils/getLaunchConfig.js
const browser = await puppeteer.launch(launchConfig)
```

Always close the browser in a `finally` block — leaked browsers exhaust memory:

```js
let browser
try {
  browser = await puppeteer.launch(launchConfig)
  // ...
} finally {
  if (browser) await browser.close()
}
```

## Lighthouse config

Config comes from `utils/getLighthouseConfig.js`. Do not inline config.

Categories audited: `performance`, `accessibility`, `best-practices`, `seo`.

**Skipped audits — keep these skipped.** They cause cold-start timeouts or bloated payloads:
```
screenshot-thumbnails, final-screenshot, largest-contentful-paint-element,
layout-shift-elements, full-page-screenshot, mainthread-work-breakdown
```

Locale env vars must be set at module level (top of file, outside handler):
```js
process.env.LC_ALL = 'en_US.UTF-8'
process.env.LANG = 'en_US.UTF-8'
process.env.LANGUAGE = 'en_US'
process.env.LIGHTHOUSE_LOCALE = 'en-US'
```

## Vercel constraints

- **Max duration**: 60s — slow URLs can hit this; Lighthouse `maxWaitForLoad` is set to 45s
- **Memory**: 1024MB — `@sparticuz/chromium` is ~80MB compressed; full `lhr` objects are large
- **Cold start**: ~2–3s before first SSE event reaches the client
- **No persistent filesystem** — use `/tmp` only; assume it's cleared between invocations
- **No background work** — execution stops when `res.end()` is called

## Adding a new endpoint

1. Create `api/<name>.js` with a default handler export
2. Add to `vercel.json`:
   ```json
   { "src": "/api/<name>", "dest": "/api/<name>.js" }
   ```
3. If it performs audits, mirror the logic in `backend/routes/lighthouse.js` and `backend/services/lighthouseService.js`
4. If it streams SSE, follow the event schema above exactly

## Known issue

`import fs from 'fs'` in `lighthouse.js` — imported but never used. Safe to remove.
