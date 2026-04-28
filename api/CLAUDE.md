# api/CLAUDE.md

Vercel serverless functions. Each file exports one default handler. Route-to-file mapping is handled by the catch-all route in `vercel.json`: `{ "src": "/api/(.*)", "dest": "/api/$1.js" }`. Subdirectory files work automatically — `api/auth/signup.js` is reachable at `POST /api/auth/signup`.

## Handler signature

```js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  // ...
}
```

## Library modules

### `api/lib/db.js` — Neon SQL client

```js
import { sql } from './lib/db.js'

// Tagged template — parameterized automatically, no manual escaping needed
const rows = await sql`SELECT * FROM users WHERE email = ${email}`
```

Uses `@neondatabase/serverless` which runs queries over HTTP (not TCP). Safe for serverless cold starts — no connection pool to exhaust. Throws `Error('DATABASE_URL is not set')` at import time if the env var is missing.

### `api/lib/auth.js` — JWT verification

```js
import { verifyToken } from './lib/auth.js'

// Required auth — call inside try/catch and forward the error:
try {
  const { userId } = verifyToken(req)
} catch (err) {
  return res.status(err.status || 401).json({ error: err.message })
}

// Optional auth — let userId stay null for guests:
let userId = null
try { userId = verifyToken(req).userId } catch { /* guest */ }
```

`verifyToken(req)` reads `Authorization: Bearer <token>`, verifies it against `JWT_SECRET`, and returns the decoded payload `{userId, email, iat, exp}`. Throws with `.status = 401` on any failure. Never returns `null` — it throws.

## Authentication endpoints

### `POST /api/auth/signup`

Body: `{ email, password }`. Validates email format and minimum 8-character password. Hashes with bcrypt (cost 10). Inserts into `users` table. Returns `{ token, user: { id, email } }` on success.

Errors: `400` (missing/invalid fields), `409` (email already in use), `500` (DB error).

### `POST /api/auth/login`

Body: `{ email, password }`. Looks up user by email, compares bcrypt hash. Returns `{ token, user: { id, email } }` on success. JWT expires in 7 days — no refresh token.

Errors: `400` (missing fields), `401` (invalid credentials), `500` (DB error).

### `GET /api/auth/check-email?email=<email>`

Returns `{ exists: boolean }`. Used by the frontend's three-step auth flow to decide whether to show the login or signup form. No auth required.

Errors: `400` (missing email param), `500` (DB error).

## AI summary endpoint

### `POST /api/ai-summary`

Auth is **required**. Returns 401 if token is missing or invalid. Calls OpenAI GPT-4.1.

Two modes selected by `tableComparison` boolean in request body:
- `false` — single-result summary: expects `{coreMetrics, scores, opportunities}`
- `true` — comparison summary: expects `{allRunsData}` (array of run objects or CSV-derived rows)

## Audit endpoint

### `POST /api/lighthouse`

Auth is **optional**. Authenticated users get DB persistence; guests get results in-browser only. See [ADR 0007](../docs/decisions/0007-auth-optional.md).

**Warmup run:** before the N user-requested runs, one extra warmup audit is run silently. Its result is discarded — it is never added to `runResults`, never emitted as `run-complete`, and never passed to `calculateAverages()` or `persistAuditRun()`. The warmup warms Chrome's DNS cache, V8 JIT, and TCP connections to the target. See [ADR 0006](../docs/decisions/0006-warmup-run-discarding.md).

**Progress ranges:**
- `prepareBrowser` emits: 0% → 10% → 20% → 30%
- Warmup runs silently in the 0–30% window
- Real runs: `baseProgress = 30 + i*(70/N)%`; `runCompleteProgress = 30 + (i+1)*(70/N)%`

**`persistAuditRun()`** — called before `res.end()` (critical: Vercel terminates on `res.end()`). Writes:
- `targets` — upserted by `(user_id, url)`
- `runs` — one row: `{device, status, runs_count: N}` (N = user-requested count, not N+1)
- `metrics` — 10 rows per run: `performance`, `accessibility`, `best-practices`, `seo` (unit: `score`), `fcp`, `lcp`, `cls`, `tbt`, `si`, `tti` (unit: `ms` except `cls` which has no unit)
- `run_artifacts` — one row with `lhr_json` (full Lighthouse result as JSONB); only when `auditView === 'full'`

**10-run cap** — after marking the run complete, a single `DELETE ... WHERE id NOT IN (SELECT id ... ORDER BY created_at DESC LIMIT 10)` removes any runs beyond the 10 most recent for that user. The single-statement approach is effectively atomic.

## History endpoint

### `GET /api/history`

Auth is **required**. Returns paginated audit history for the authenticated user.

Query params:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `url` (optional) — exact-match filter on `targets.url`

Response:
```json
{
  "runs": [
    {
      "id": "uuid",
      "url": "https://...",
      "device": "desktop",
      "runs_count": 3,
      "status": "complete",
      "created_at": "...",
      "completed_at": "...",
      "scores": {
        "performance": 87, "accessibility": 94, "best_practices": 91, "seo": 100,
        "fcp": 1420, "lcp": 2380, "si": 2100, "cls": 0.03, "tbt": 180, "tti": 3200
      }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

Errors: `401` (missing/invalid token), `500` (DB error).

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
| `run-complete` | each **real** run finishes (not warmup) | `currentRun`, `totalRuns`, `runResult: {scores, metrics, opportunities, diagnostics}` |
| `complete` | all runs done | `data.run` (single) or `data.runs[] + data.averages` (multi) |
| `error` | any failure | `error: true`, `message`, `stack` |

Rules:
- Progress is **monotonically increasing** — never send a value lower than the previous one
- Always call `res.end()` after `complete` or `error`
- `fullReport: {categories, audits, configSettings}` is appended to each run result only when `auditView === 'full'`
- The warmup run emits **no** `run-complete` event

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

- **Max duration**: 60s — warmup + N runs on slow URLs pushes this limit; Lighthouse `maxWaitForLoad` is set to 45s
- **Memory**: 1024MB — `@sparticuz/chromium` is ~80MB compressed; full `lhr` objects are large
- **Cold start**: ~2–3s before first SSE event reaches the client
- **No persistent filesystem** — use `/tmp` only; assume it's cleared between invocations
- **No background work** — execution stops when `res.end()` is called; `persistAuditRun()` must be awaited before `res.end()`

## Adding a new endpoint

1. Create `api/<name>.js` with a default handler export — the catch-all route in `vercel.json` handles it automatically
2. If it needs auth, import `verifyToken` from `./lib/auth.js`
3. If it needs DB, import `sql` from `./lib/db.js`
4. If it performs audits, mirror the logic in `backend/routes/lighthouse.js` and `backend/services/lighthouseService.js`
5. If it streams SSE, follow the event schema above exactly
