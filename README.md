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
| Database | Neon Postgres (`@neondatabase/serverless` — HTTP-based, serverless-compatible) |
| Auth | JWT (`jsonwebtoken`) + bcrypt; optional on the audit endpoint (guests can audit without an account) |
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

# Database migrations
npm run db:migrate         # apply all pending migrations
npm run db:migrate:down    # roll back the last migration
npm run db:migrate:create  # scaffold a new SQL migration file
```

Requires Node 22.x. Copy `.env.example` to `.env` and fill in:

| Variable | Required for |
|----------|-------------|
| `OPENAI_API_KEY` | AI summaries (`/api/ai-summary`) |
| `DATABASE_URL` | Auth + history (Neon Postgres connection string) |
| `JWT_SECRET` | Token signing — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

Auth and history features are disabled if `DATABASE_URL` / `JWT_SECRET` are not set. The audit engine works without them.

---

## Architecture

Two backend modes share the same SSE event schema so the frontend doesn't know which it's talking to:

- **`/api/`** — Vercel serverless, uses `@sparticuz/chromium` for headless Chrome in Lambda environments; includes JWT auth and Neon Postgres persistence for authenticated users
- **`/backend/`** — Express on port 3001, uses local system Chrome via `chrome-launcher`; no auth layer (alternative deployment only)

Audit results are persisted to Neon Postgres for logged-in users. Guests can run audits without an account — results are shown in-browser only. A `/history` view lets authenticated users browse past audits with score and Core Web Vitals badges.

For a full architectural narrative — including why SSE not WebSockets, why two backends, where the bottlenecks are, and how auth flows through the system — see [`docs/architecture.md`](docs/architecture.md).

---

## Roadmap

Phase 0 (documentation and cleanup) and Phase 1 (Postgres persistence + JWT auth) are complete. Phase 2 (async scheduled audits, BullMQ, trend visualization) is next.

→ See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full phased plan, status of each item, and what's deliberately out of scope.

---

## Decision records

Major technical decisions are documented as ADRs in [`docs/decisions/`](docs/decisions/):

- [0001](docs/decisions/0001-dual-deployment-vercel-serverless-and-express.md) — dual-mode deployment
- [0002](docs/decisions/0002-sse-not-websockets.md) — SSE over WebSockets
- [0003](docs/decisions/0003-no-auth-v1.md) — no auth in v1 *(superseded by 0007)*
- [0004](docs/decisions/0004-no-state-manager.md) — `provide`/`inject` over Pinia
- [0005](docs/decisions/0005-multi-run-aggregation-strategy.md) — multi-run aggregation asymmetry
- [0006](docs/decisions/0006-warmup-run-discarding.md) — warmup run discarding (N+1 runs, first discarded)
- [0007](docs/decisions/0007-auth-optional.md) — authentication is optional; guests can run audits
