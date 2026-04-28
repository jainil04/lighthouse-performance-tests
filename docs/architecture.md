# Architecture

> **Dual-audience doc.** Written for future Claude Code sessions that need to understand the system, and for interview prep — the kind of doc you read for 5 minutes before a system design round and come out ready to talk for 30.

---

## 1. System overview

Lighthouse Performance Tests is a web application that measures how fast and accessible a website is. A user enters a URL, chooses a device type (desktop or mobile) and how many times to run the test, and clicks run. Within seconds, a real-time progress bar advances while a headless Chrome browser loads the target site, runs Google's open-source Lighthouse auditing engine against it, and streams results back. The user sees four category scores (Performance, Accessibility, Best Practices, SEO), Core Web Vitals, per-audit breakdowns, and — optionally — an AI-generated plain-language summary of what to fix and why.

The system runs across two tiers. The frontend is a Vue 3 single-page application deployed as a Vercel static build. The backend is a Vercel serverless function (the production path) that spins up a stripped Chromium binary on demand, runs Lighthouse against the target URL, and streams progress back to the browser over a long-lived HTTP response. There is also a standalone Express server in `/backend/` that does the same job using local system Chrome — it exists as an alternative deployment target for non-Vercel infrastructure and as a development convenience when `vercel dev` is unavailable.

The non-obvious architectural constraint is that Lighthouse is a CPU-heavy, multi-second process. It cannot be a fast JSON endpoint — it takes 5–30 seconds per run, longer on slow target sites. The entire streaming architecture exists to make that wait feel like progress rather than a frozen spinner.

---

## 2. Architecture diagram

### System topology

```mermaid
flowchart TD
    User(["👤 User\n(Browser)"])
    SPA["Vue 3 SPA\nVercel Static\nlocalhost:5173 in dev"]
    Proxy["Vite Dev Proxy\n/api/* → :3000"]

    subgraph Production ["Vercel Platform (production)"]
        VFunc["api/lighthouse.js\nServerless Function\n60s / 1024MB"]
        VFunc2["api/ai-summary.js\nServerless Function"]
        VFuncAuth["api/auth/*.js\nsignup / login / check-email"]
        VFuncHistory["api/history.js\nGET — auth required"]
    end

    subgraph Alternative ["Alternative Deploy"]
        Express["backend/server.js\nExpress :3001\n(no auth layer)"]
    end

    subgraph AuditEngine ["Audit Engine (inside serverless fn or Express)"]
        Puppeteer["Puppeteer\n+ @sparticuz/chromium\n(or chrome-launcher)"]
        Chrome["Headless Chrome\nCDP WebSocket"]
        LH["Lighthouse v12\nconnects via CDP port"]
    end

    OpenAI["OpenAI GPT-4.1\napi/ai-summary.js"]
    NeonDB[("Neon Postgres\n@neondatabase/serverless\nusers · targets · runs\nmetrics · run_artifacts")]
    VFuncJobs["api/jobs.js\nPOST enqueue / GET list"]
    Redis[("Redis\nUpstash/Railway\nKV_URL — ioredis TCP\nBullMQ repeatable queue")]
    Worker["backend/workers/auditWorker.js\nBullMQ worker\n(persistent, Express process)"]

    User -->|"load app"| SPA
    SPA -->|"POST /api/lighthouse\n{url, device, runs, auditView}\n+ optional Bearer token"| Proxy
    Proxy -->|dev: proxy to :3000| VFunc
    SPA -->|"SSE stream\ndata: {...}\\n\\n"| User
    SPA -->|"POST /api/jobs\n{url, schedule}"| VFuncJobs
    VFunc --> Puppeteer
    Puppeteer -->|"launch + wsEndpoint"| Chrome
    Chrome -->|"CDP WebSocket"| LH
    LH -->|"lhr JSON"| VFunc
    VFunc -->|"persist run + metrics\n(authenticated users only)"| NeonDB
    VFunc -->|"POST /api/ai-summary\n(from FileUploadView)"| VFunc2
    VFunc2 -->|"fetch"| OpenAI
    VFuncAuth -->|"users table"| NeonDB
    VFuncHistory -->|"runs + metrics JOIN"| NeonDB
    VFuncJobs -->|"repeatable job\nrepeat:{pattern:schedule}"| Redis
    Redis -->|"auto-dequeue on cron"| Worker
    Worker -->|"persist run + metrics"| NeonDB
    Worker -.->|"Lighthouse via\nchrome-launcher"| Chrome
    Express -.->|"same audit logic\nchrome-launcher instead"| Chrome
```

### Audit pipeline: SSE event sequence

```mermaid
sequenceDiagram
    participant FE as Frontend<br/>(useLighthouseAudit.js)
    participant API as api/lighthouse.js
    participant CH as Chrome + Lighthouse
    participant DB as Neon Postgres

    FE->>API: POST /api/lighthouse {url, device, runs, auditView}<br/>+ Authorization: Bearer <token> (optional)
    Note over API: verifyToken() — sets userId if valid,<br/>null if missing/invalid (guest mode)
    API-->>FE: SSE headers (200, text/event-stream)
    API-->>FE: progress {stage: initialization, 0%}
    API->>CH: puppeteer.launch() → getLaunchConfig()
    API-->>FE: progress {stage: browser-setup, 10%}
    API-->>FE: progress {stage: browser-launch, 20%}
    API-->>FE: progress {stage: lighthouse-setup, 30%}

    Note over API,CH: Warmup run (silent) — warms Chrome + DNS + V8.<br/>Result discarded. No run-complete event emitted.<br/>globalProgress = 30%

    API->>CH: lighthouse(url, {port}, config) [warmup]
    CH-->>API: lhr [discarded]

    loop For each real run i = 0..N-1
        Note over API: baseProgress = 30 + i*(70/N)%
        API-->>FE: progress {stage: audit, baseProgress}
        API->>CH: lighthouse(url, {port}, config)
        Note over API: setInterval simulates progress<br/>+5-10% every 2s during audit
        API-->>FE: progress {stage: audit-running, interpolated}
        CH-->>API: lhr (Lighthouse Result)
        API-->>FE: run-complete {scores, metrics, opps, diagnostics}
        Note over API: runCompleteProgress = 30 + (i+1)*(70/N)%<br/>500ms delay before next run
    end

    API-->>FE: progress {stage: finalizing, 95%}
    API-->>FE: complete {data: run|runs+averages}

    opt userId != null (authenticated user)
        API->>DB: INSERT INTO targets (upsert by url)
        API->>DB: INSERT INTO runs (status: pending, runs_count: N)
        API->>DB: INSERT INTO metrics (scores × 4, CWV × 6)
        opt auditView === 'full'
            API->>DB: INSERT INTO run_artifacts (lhr_json)
        end
        API->>DB: UPDATE runs SET status = 'complete'
    end

    API->>CH: browser.close()
    API-->>FE: (stream ends, res.end())
```

---

## 3. Request lifecycle: a single audit

When a user enters a URL and clicks Run Audit:

**1. User submits the form**
`src/views/HomeView.vue` → `handleUrlSubmit()` → calls `useLighthouseAudit.runAudit(auditConfig)` with `{url, device, throttle, runs, auditView}`.

**2. State machine resets**
`src/composables/useLighthouseAudit.js` → `runAudit()` sets `isRunning = true`, zeros all refs (`scores`, `detailedMetrics`, `allRunsData`, etc.), dispatches `window.CustomEvent('audit-start')` so `AppSidebar` closes on mobile.

**3. Frontend opens the stream**
`src/utils/lighthouseApi.js` → `streamLighthouseAudit()` issues:
```
POST /api/lighthouse
Content-Type: application/json
Authorization: Bearer <token>   ← omitted if no token in localStorage
Body: {"url":"...","device":"desktop","throttle":"none","runs":1,"auditView":"standard"}
```
Uses `fetch()` + `response.body.getReader()` — not `EventSource`, because `EventSource` only supports GET.

**3b. JWT verification (optional, inside the handler)**
`api/lighthouse.js` calls `verifyToken(req)` in a try/catch. If a valid `Authorization: Bearer <token>` header is present, `userId` is set to the decoded user ID. If the header is absent or the token is invalid/expired, the catch block swallows the error and `userId` remains `null`. The audit proceeds normally in both cases — auth is not required to run an audit. See [ADR 0007](decisions/0007-auth-optional.md).

**4. Vite proxy forwards to Vercel**
`vite.config.js` proxies `/api/*` → `http://localhost:3000` (running `vercel dev`).

**5. SSE headers go out immediately**
`api/lighthouse.js` → `handler()` writes `200 text/event-stream` headers before touching Chrome. The connection is now open. The frontend's `fetch` resolves here — the `getReader()` loop starts consuming.

**6. Browser launch and warmup (progress: 0% → 30%)**
`api/lighthouse.js` → `prepareBrowser(isProduction, onProgress)` calls `getLaunchConfig.js`. In production (`process.env.VERCEL` truthy): `@sparticuz/chromium` provides a pre-built Chromium binary path and launch args. In development: `findLocalChrome.js` locates the local Chrome install. `puppeteer.launch(launchConfig)` starts the browser and returns a `wsEndpoint` (a `ws://localhost:{port}/...` URL).

After the browser is ready, `runWarmupAudit()` silently runs one extra Lighthouse audit whose result is immediately discarded. This warms up Chrome's DNS cache, V8 JIT, and TCP connections to the target site. No progress events are emitted during the warmup — it is absorbed into the 0–30% initialization window. See [ADR 0006](decisions/0006-warmup-run-discarding.md).

**7. Lighthouse connects to Chrome via CDP**
`api/lighthouse.js` → `runLighthouseAudit()` extracts the port from `wsEndpoint`:
```js
port: new URL(wsEndpoint).port
```
Lighthouse does **not** launch its own browser — it connects via Chrome DevTools Protocol (CDP) WebSocket to the Puppeteer-managed Chrome instance. This is why the two are decoupled.

**8. Lighthouse runs (progress: 30% → 100%)**
`lighthouse(url, {port, output: 'json', logLevel: 'error'}, lighthouseConfig)` runs the full audit. Lighthouse exposes no granular progress events during execution. A `setInterval` running every 2 seconds simulates progress by adding 5–10% increments. The 30–100% range is divided equally across N real runs: run i starts at `30 + i*(70/N)%` and completes at `30 + (i+1)*(70/N)%`. All `onProgress()` calls enforce monotonic increase before writing `data: {...}\n\n` to the response.

**9. lhr extraction**
On `lighthouse()` resolving, `api/lighthouse.js` extracts from the raw `lhr` (Lighthouse Result) object:
- **scores**: `lhr.categories.*.score × 100` → integers 0–100
- **metrics**: 18 specific `lhr.audits[key].numericValue` fields (FCP, LCP, CLS, TBT, SI, TTI, etc.)
- **opportunities**: any audit with `details.overallSavingsMs > 0`
- **diagnostics**: any audit with `scoreDisplayMode === 'informative'` or `'notApplicable'`
- **fullReport** (only if `auditView === 'full'`): `{categories, audits, configSettings}` — the complete raw lhr structure

**10. `run-complete` event streams to frontend**
Each completed run emits `{type: 'run-complete', currentRun, totalRuns, runResult: {scores, metrics, opportunities, diagnostics}}`. The frontend appends one row to `allRunsData` and updates live score displays. Note: `fullReport` is **not** in `run-complete` — it only arrives in `complete`.

**11. Averaging (multi-run only)**
After all runs complete, `calculateAverages(runResults)` computes arithmetic means for scores and metrics across all runs. **Opportunities and diagnostics are not averaged** — they are taken from run 1 only (see [ADR 0005](decisions/0005-multi-run-aggregation-strategy.md) for the asymmetric aggregation behavior and deferred alternatives).

**12. `complete` event closes the stream**
Single run: `{type: 'complete', data: {run, summary}}`. Multi-run: `{type: 'complete', data: {runs[], averages, summary}}`. `res.end()` is called. `browser.close()` runs in the `finally` block regardless of success or failure.

**12b. DB persistence (authenticated users only)**
Before `res.end()`, `persistAuditRun()` is called if `userId !== null`. It upserts the target URL into `targets`, inserts a row into `runs` (with `runs_count = N`), inserts 10 metric rows (4 category scores + 6 CWVs) into `metrics`, and optionally inserts the full lhr into `run_artifacts` (only when `auditView === 'full'`). The write is awaited synchronously before `res.end()` — Vercel terminates the function the moment `res.end()` is called, so any async work deferred to `finally` cannot be guaranteed to complete.

**13. Frontend finalizes state**
`useLighthouseAudit.js` → `handleProgressUpdate()` handles `type: 'complete'`: sets `auditResults`, finalizes `scores`/`detailedMetrics`/`opportunities`/`diagnostics`/`fullReport`. Also calls `showNotification()` from `useAuditNotification` — shows an "Audit complete ✓" badge that auto-dismisses after 2 seconds of the tab being visible (Page Visibility API).

**14. UI updates**
Vue reactivity propagates to `PerformanceMetrics.vue` (score cards), `AuditResults.vue` (table or full report). `AuditResults.vue` watches `hasAuditData` and triggers `animateSlideDownEntry()` + `animateCascade()` via GSAP. `HomeView.vue` watches `progress` hitting 100 and calls `playOn()` (pop sound via `useSound.js`).

---

## 4. Why two backends?

The short answer: Vercel serverless is the right default for a portfolio project; Express is the escape hatch when Vercel's constraints bite.

**`/api/` — Vercel serverless**

Vercel deploys each file in `api/` as an isolated serverless function. Zero infrastructure to manage: no EC2, no process manager, no uptime monitoring. The tradeoff is hard constraints: 60-second max execution time, 1024MB RAM, no persistent process, no filesystem writes outside `/tmp`. Each invocation is stateless and ephemeral.

The Chrome binary problem is the interesting part. A real Chrome install is ~300MB. Serverless functions have tight bundle size limits. `@sparticuz/chromium` is a community-maintained stripped Chromium build (~80MB compressed) that runs in Lambda-style environments. `vercel.json` explicitly includes it in the function bundle alongside Lighthouse and its peer dependencies. Without this `includeFiles` config, the function would deploy without Chrome and fail on every invocation.

**`/backend/` — standalone Express**

The Express server uses `chrome-launcher` to find whatever Chrome is already installed on the host. It runs as a persistent process on port 3001, has no timeout, and can (in principle) run BullMQ workers in the same process. It's the right choice for Railway, Render, or a VPS deploy.

The parity contract: both backends must emit the same SSE event types with identical field names and shapes. The frontend doesn't know which backend it's talking to — it just reads `data: {type, progress, ...}` off the stream. If they diverge, the frontend breaks silently with missing or misnamed fields. Today this is enforced by convention (the rule in `backend/CLAUDE.md`), not by a shared schema or type system.

**The job queue split (Phase 2)**

BullMQ scheduled jobs (see [ROADMAP Phase 2](ROADMAP.md)) require a persistent Redis-connected worker process. Vercel serverless functions cannot run persistent workers — they terminate after `res.end()`. The architecture is now split: Vercel handles on-demand audits; the Express backend hosts the BullMQ worker (`backend/workers/auditWorker.js`), started automatically via dynamic import when `backend/server.js` starts. `POST /api/jobs` (and `GET /api/jobs`) enqueue and list scheduled audits, with job data persisted in Redis (`KV_URL`, ioredis TCP). This is the clearest reason the Express backend is not throwaway code.

---

## 5. Job queue: scheduled audit flow

Scheduled audits use BullMQ backed by Redis (`KV_URL`, ioredis TCP connection to Upstash/Railway).

**Enqueue path (`POST /api/jobs`):**
1. The Vercel serverless function authenticates the request, validates the schedule against a whitelist (`"0 9 * * *"` / `"0 9 * * 1"` / `"0 9 1 * *"`), enforces a max-5-scheduled-URLs-per-user cap, and upserts the target row in Postgres with the `schedule` column set.
2. The job is added to BullMQ with `repeat: { pattern: schedule }` — BullMQ stores the cron pattern in Redis and automatically re-enqueues the job after each execution, indefinitely, with no further API calls required.
3. The job payload carries `{userId, url, device, runs}`. The function returns the job ID immediately — no audit runs synchronously.

**Worker path (`backend/workers/auditWorker.js`):**
1. `backend/server.js` dynamically imports the worker on startup. The worker connects to the same Redis queue and registers a `process` handler.
2. When a job is dequeued, the worker launches Chrome via `chrome-launcher`, runs Lighthouse, and calls `api/lib/persistAuditRun.js` to write results into Neon Postgres — the same shared utility used by `api/lighthouse.js`.
3. On success, the run row in Postgres transitions from `pending` → `complete`. On failure, BullMQ retries with exponential backoff.

The key constraint: the worker must run in the Express backend (a persistent process), not in Vercel serverless functions, which terminate after `res.end()`. This is why the dual-backend split exists — see [ADR 0001](decisions/0001-dual-deployment-vercel-serverless-and-express.md).

---

## 6. Streaming: why SSE not WebSockets?

A Lighthouse audit is a one-way broadcast: the server has information (progress, results) that it pushes to the client. The client never sends anything mid-audit. WebSockets are a bidirectional full-duplex channel — that's the wrong tool for a unidirectional stream.

SSE is HTTP. The server sends a `200` response with `Content-Type: text/event-stream` and writes `data: {...}\n\n` lines. No protocol upgrade, no handshake, no special server support. It works through HTTP proxies (including Vite's dev proxy). It works inside Vercel serverless functions — the response body is just a long-lived write stream. WebSocket upgrades inside serverless functions are not reliably supported across platforms.

The implementation detail worth knowing: the frontend does **not** use the browser's `EventSource` API, even though this is technically an SSE stream. `EventSource` only works with GET requests. The audit requires a POST body (`{url, device, runs, auditView}`). Instead, `src/utils/lighthouseApi.js` uses `fetch()` and manually reads `response.body.getReader()`, parsing `data: ` lines out of the raw byte stream. The result is identical to `EventSource` from the consumer's perspective.

The one real tradeoff: SSE is unidirectional. If you wanted to cancel an in-progress audit from the browser, you'd need a separate `POST /api/cancel` endpoint — there's no in-stream message channel back to the server. That cancellation endpoint doesn't exist yet.

---

## 7. Where the bottlenecks are

**Vercel 60-second timeout.** Lighthouse itself sets `maxWaitForLoad: 45000ms` (45 seconds per run). Multi-run audits on slow target sites hit 60 seconds quickly. 3 runs × 20s each = 60s exactly. Any retries, network hiccups, or slow page loads push this over. There's no graceful degradation — the function terminates and the SSE connection drops.

**Cold starts.** The first request after a period of inactivity triggers a cold start: Vercel provisions a new container, loads the function bundle (~150MB+ including Chromium), and only then starts the handler. This adds 3–5 seconds before the first SSE event reaches the frontend. Subsequent requests within the same container reuse the warm instance. The frontend has no awareness of cold starts — the progress bar just sits at 0% for a few extra seconds.

**Lighthouse is single-threaded and CPU-bound.** One audit run occupies the function's CPU fully for its entire duration. The serverless function handles one audit at a time. There is no queue, no concurrency management, no rate limiting. If 10 users submit audits simultaneously, Vercel spins up 10 separate function instances (10× the cold start cost, 10× the Chromium memory). This works fine for a portfolio project; it would be expensive at scale.

**Progress simulation is fake.** During each Lighthouse execution, the server has no real progress signal from Lighthouse. It runs a `setInterval` every 2 seconds adding 5–10% randomly, capped at 90% of each run's progress budget. The bar is an approximation of real progress. A 5-second audit and a 30-second audit both animate the same way until `run-complete` arrives.

**OpenAI latency.** The AI summary (`api/ai-summary.js`) makes a synchronous `fetch` call to the OpenAI Chat Completions API. Response time varies 1–10 seconds. This is a separate request triggered by the user, not part of the audit stream, so it doesn't block audit results — but it makes the AI summary panel feel slow on poor network days.

**Warmup run cost.** Every audit now runs N+1 Lighthouse executions — one silent warmup plus N real runs. On a slow target site (20s/run), a 3-run audit now takes ~80 seconds of Chrome time instead of ~60, pushing hard against Vercel's 60-second function timeout. Users running 3+ runs on slow sites should consider using the Express backend (no timeout). See [ADR 0006](decisions/0006-warmup-run-discarding.md).

**DB write before `res.end()`.** `persistAuditRun()` in `api/lighthouse.js` is awaited synchronously before the response ends. A slow Neon connection or a lock on the `targets` table adds latency between the `complete` SSE event and the stream closing. On first invocation after a cold period, both the Vercel function and the Neon connection are cold — a combined cold-start penalty of 3–5s (Vercel) + 100–300ms (Neon HTTP handshake) is possible.

**Neon cold connections.** The Neon serverless driver (`@neondatabase/serverless`) uses HTTP rather than persistent TCP. Every invocation that hits a cold Neon edge node opens a new HTTP session. This is faster than a full TCP + TLS + Postgres handshake (Neon caches the heavy parts at the edge) but still adds ~100–300ms on cold paths. Unlike a pg connection pool, there are no idle connections to reuse across invocations.

**If traffic 10×'d:** The serverless model scales automatically (Vercel spins up new instances), but cost and cold-start frequency would spike. Guest audits have no rate limiting — anyone can trigger a 60-second Chrome instance. The realistic failure mode is Vercel usage bill, not downtime. Phase 4 rate limiting will partially mitigate this.

---

## 8. What's NOT here yet

**Phase 1 complete** (2026-04-27) — authentication, persistence, and history. Logged-in users can run audits, close the tab, return to `/history`, and see saved results. Guests can still audit without an account — results are ephemeral.

**Phase 2 complete** (2026-04-28) — job queue infrastructure, trend visualization, scheduled audits UI, and regression detection are all live. Users configure Daily/Weekly/Monthly audit schedules per URL from `HistoryView.vue`; `POST /api/jobs` enqueues a BullMQ repeatable job that re-fires automatically on the cron pattern with no further intervention. `HistoryView.vue` computes `regressionMap` comparing the most recent run against the average of all previous runs for the filtered URL and renders an exclamation-triangle icon on regressed metric badges (thresholds: score metrics ≥10 point drop, time metrics ≥20% increase, CLS ≥0.1 increase).

What remains unbuilt:

- **Rate limiting** — no per-IP or per-user quotas. Guest audits are entirely open. Planned for Phase 4 via Redis token bucket.
- **Audit cancellation** — no `DELETE /api/jobs/:id` or SSE close detection. An in-progress audit that the user navigates away from continues to completion server-side.
- **Multi-tenancy / team workspaces** — all data is user-scoped; no team or organization sharing layer.
- **Token refresh** — the JWT is a single 7-day access token. No refresh token, no sliding sessions. After expiry, the user is silently logged out.

For the full phased plan — what's next, in what order, and what's deliberately out of scope — see [`docs/ROADMAP.md`](ROADMAP.md).

---

## 9. Glossary

**SSE (Server-Sent Events)**: A standard HTTP mechanism for one-way server-to-client streaming. The server holds a `200` response open and writes `data: ...\n\n` lines. The browser reads them incrementally. Simpler than WebSockets; works over standard HTTP proxies.

**CDP (Chrome DevTools Protocol)**: The WebSocket protocol Chrome exposes for programmatic control — navigating pages, reading console output, running audits. Both Puppeteer and Lighthouse communicate with Chrome over CDP.

**BFF (Backend for Frontend)**: An API layer purpose-built for a specific frontend client, containing only the data-shaping and aggregation logic that frontend needs. `api/lighthouse.js` functions as a BFF: it calls Lighthouse, extracts and reshapes only the fields the Vue SPA needs, and discards the rest of the raw `lhr` object.

**MFE (Micro-Frontend)**: An architecture pattern where a frontend application is split into independently deployable UI modules, often owned by separate teams. Common in large enterprise apps (e.g., Williams-Sonoma's storefront architecture). This project is a single monolithic SPA — not an MFE — but the component layer boundaries (`layout/` / `sections/` / `common/` / `forms/`) mirror the separation-of-concerns thinking that MFE architectures enforce at the deployment level.

**Core Web Vitals**: Google's set of user-experience metrics that Lighthouse measures: **FCP** (First Contentful Paint — time until first text/image renders), **LCP** (Largest Contentful Paint — time until the largest above-the-fold element renders), **CLS** (Cumulative Layout Shift — visual stability; how much content jumps around during load), **TBT** (Total Blocking Time — how long the main thread was blocked by JavaScript), **TTI** (Time to Interactive — when the page becomes reliably interactive), **SI** (Speed Index — how quickly content is visually populated).

**Puppeteer**: A Node.js library that controls a Chrome or Chromium browser via CDP. In this project it's used only to launch Chrome and get a `wsEndpoint`. Lighthouse then takes over the browser via that endpoint.

**Lighthouse engine**: Google's open-source website auditing tool. Given a URL and a Chrome connection, it loads the page, runs ~150 individual audits across Performance, Accessibility, Best Practices, and SEO categories, and returns a raw `lhr` (Lighthouse Result) JSON object. In this project it runs inside the serverless function, not in the user's browser.

**`@sparticuz/chromium`**: A community-maintained stripped Chromium build (~80MB compressed) designed to run in AWS Lambda-style serverless environments where a full Chrome install is impractical. It provides the `executablePath` and recommended launch `args` for headless serverless operation.

**JWT (JSON Web Token)**: A compact, self-contained token format used for stateless authentication. `api/lib/auth.js` issues JWTs signed with `JWT_SECRET` via `jsonwebtoken`. Clients include them as `Authorization: Bearer <token>`. The server verifies the signature without a DB lookup. Tokens expire after 7 days; there is no refresh token.

**Neon**: A serverless Postgres provider. The project uses `@neondatabase/serverless`, which runs queries over HTTP rather than persistent TCP, making it compatible with Vercel's stateless function model. The connection string in `DATABASE_URL` points to Neon's pooled endpoint.

**bcrypt**: A password-hashing algorithm with a configurable cost factor. Used in `api/auth/signup.js` with a cost of 10. Raw passwords are never stored. `bcrypt.compare()` in `api/auth/login.js` validates login attempts in constant time.

**node-pg-migrate**: A SQL migration tool (dev dependency). Migration files live in `migrations/`. The `npm run db:migrate` / `db:migrate:down` / `db:migrate:create` scripts wrap its CLI with `--env-file=.env` so `DATABASE_URL` is loaded automatically.

---

## Appendix: known inconsistencies

These were found during the architecture audit and do not yet match the code:

1. ~~**`vercel.json` sets `LC_ALL=C`** in its `env` block, but `api/lighthouse.js` overwritten it at module load time.~~ **Fixed** — `LC_ALL` removed from `vercel.json`; code-level setter is the single source of truth.

2. ~~**`/api/lighthouse/audit/stream` route in `vercel.json`** — legacy alias never called by the frontend.~~ **Fixed** — route removed; catch-all `"/api/(.*)"` handles all handlers.

3. ~~**`import fs from 'fs'` in `api/lighthouse.js:3`** — unused import.~~ **Fixed** — import removed.

4. **Multi-run opportunities and diagnostics are not averaged.** `calculateAverages()` in `api/lighthouse.js` takes both fields from `results[0]` only. Only `scores` and `metrics` are arithmetically averaged. Documented and deferred in [ADR 0005](decisions/0005-multi-run-aggregation-strategy.md). Note: with the warmup run now discarded, `results[0]` is the first *real* run, not the warmup.
