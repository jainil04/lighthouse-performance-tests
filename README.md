# Lighthouse Monitor

A full-stack web performance audit tool. Enter a URL, choose a device profile and how many runs to average, and get real-time Lighthouse scores streamed back as the audit runs — Performance, Accessibility, Best Practices, SEO, Core Web Vitals, and an optional AI-generated plain-language summary of what to fix.

**Live demo:** [lighthouse-performance-tests.vercel.app](https://lighthouse-performance-tests.vercel.app)

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | Vue 3 (Composition API, `<script setup>`), Vite, PrimeVue 4, Tailwind CSS 4, GSAP |
| API | Vercel serverless functions (`/api/`) — primary; Express server (`/backend/`) — alternative |
| Audit engine | Lighthouse v12 + Puppeteer Core + `@sparticuz/chromium` |
| AI summary | OpenAI GPT-4.1 |
| Streaming | Server-Sent Events over HTTP (not WebSockets) |
| Deployment | Vercel (frontend + serverless functions) |

---

## Running locally

```bash
# Full local dev (recommended)
vercel dev          # Vercel dev server → http://localhost:3000 (functions + static)
npm run dev         # Vite dev server → http://localhost:5173 (proxies /api/* to :3000)

# Build
npm run build && npm run preview

# Alternate: Express backend (change Vite proxy to port 3001 first)
cd backend && npm run dev
```

Requires Node 22.x. Set `OPENAI_API_KEY` in `.env` for AI summaries.

---

## Architecture

Two backend modes share the same SSE event schema so the frontend doesn't know which it's talking to:

- **`/api/`** — Vercel serverless, uses `@sparticuz/chromium` for headless Chrome in Lambda environments
- **`/backend/`** — Express on port 3001, uses local system Chrome via `chrome-launcher`

For a full architectural narrative — including why SSE not WebSockets, why two backends, and where the bottlenecks are — see [`docs/architecture.md`](docs/architecture.md).

---

## Roadmap

Phase 0 (documentation and cleanup) is complete. Phase 1 (Postgres persistence + JWT auth) is next.

→ See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full phased plan, status of each item, and what's deliberately out of scope.

---

## Decision records

Major technical decisions are documented as ADRs in [`docs/decisions/`](docs/decisions/):

- [0001](docs/decisions/0001-dual-deployment-vercel-serverless-and-express.md) — dual-mode deployment
- [0002](docs/decisions/0002-sse-not-websockets.md) — SSE over WebSockets
- [0003](docs/decisions/0003-no-auth-v1.md) — no auth in v1
- [0004](docs/decisions/0004-no-state-manager.md) — `provide`/`inject` over Pinia
- [0005](docs/decisions/0005-multi-run-aggregation-strategy.md) — multi-run aggregation asymmetry
