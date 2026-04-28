# CLAUDE.md

Full-stack Lighthouse performance audit tool. Vue 3 SPA frontend, two backend modes (Vercel serverless `/api/` for production, Express `/backend/` for alternate deploys), real-time audit progress streamed over SSE, AI summaries via OpenAI GPT-4.1.

## Commands

```bash
# Frontend — always run this
npm run dev          # Vite dev server → http://localhost:5173

# API — primary (Vercel serverless, proxied by Vite at /api/*)
vercel dev           # Serverless functions + static → http://localhost:3000

# API — alternate (Express, requires changing Vite proxy to port 3001)
cd backend && npm run dev    # nodemon, port 3001
cd backend && npm run start  # production, port 3001

# Build
npm run build && npm run preview

# Database migrations (requires DATABASE_URL in .env)
npm run db:migrate         # apply pending migrations
npm run db:migrate:down    # roll back last migration
npm run db:migrate:create  # scaffold a new SQL migration file
```

Full local dev: run `vercel dev` + `npm run dev` together. Vite proxies `/api/*` → `http://localhost:3000`.

## Architecture

```
Browser → Vue 3 SPA (src/)
              ↓  POST /api/lighthouse  (SSE stream)
          ┌───────────────────────────┐
          │  Vercel serverless (api/) │ ← primary deployment
          │  Express server (backend/)│ ← alternate deployment
          └───────────────────────────┘
              ↓                           ↓
          Puppeteer → Chrome → Lighthouse → lhr → SSE events → frontend refs
                                                               ↓ (authenticated users)
                                                           Neon Postgres
```

| Layer | Path | Details |
|---|---|---|
| Vercel serverless | `api/` | `puppeteer-core` + `@sparticuz/chromium`; auth + DB persistence — `api/CLAUDE.md` |
| Express server | `backend/` | `chrome-launcher` (local system Chrome); no auth layer — `backend/CLAUDE.md` |
| Vue 3 SPA | `src/` | `src/CLAUDE.md` |
| Auth helpers | `api/lib/` | `auth.js` (JWT verify), `db.js` (Neon SQL client) |
| DB persistence util | `api/lib/persistAuditRun.js` | shared helper used by `api/lighthouse.js` and the BullMQ worker |
| Auth endpoints | `api/auth/` | `signup.js`, `login.js`, `check-email.js` |
| History endpoint | `api/history.js` | paginated audit history (authenticated only) |
| Jobs endpoints | `api/jobs.js` | `POST` enqueue scheduled audit, `GET` list targets for user |
| BullMQ worker | `backend/workers/auditWorker.js` | persistent process; started automatically via dynamic import in `backend/server.js` |
| DB migrations | `migrations/` | `node-pg-migrate`; run with `npm run db:migrate` |

## Cross-cutting rules

- **ESM only** — `"type": "module"` in both `package.json` files. No `require()`.
- **Node 22.x** required.
- **No state manager** — global state is `ref` + `provide` in `App.vue`. No Pinia/Vuex.
- **No test framework** — don't scaffold tests without explicit instruction.
- **No linter/formatter** — ESLint/Prettier not configured. Don't add them without asking.

## Environment variables

```
OPENAI_API_KEY    # Required for /api/ai-summary (GPT-4.1)
DATABASE_URL      # Required for auth + history — Neon Postgres connection string
                  # e.g. postgresql://user:pass@host/db?sslmode=require
JWT_SECRET        # Required for auth — 64-byte random hex string
                  # generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
KV_URL            # Required for BullMQ job queue — Upstash/Railway Redis, ioredis TCP format
                  # e.g. redis://default:password@host:port
```

`VITE_API_URL` and all `HF_*` Hugging Face vars exist in `.env` but are unused — ignore them.

## Deployment

`vercel.json`: `api/*.js` → `@vercel/node`, 60s timeout, 1024MB RAM. Frontend → `@vercel/static-build`. Catch-all route `/api/(.*)` → `/api/$1.js`.

## Further reading

- Architecture narrative + data flow diagram: `docs/architecture.md`
- Decision records (SSE vs WebSockets, dual backend, optional auth, warmup discarding, no state manager): `docs/decisions/`
- Phased plan + architectural constraints (BullMQ, scheduled jobs, rate limiting): `docs/ROADMAP.md` — **read the Design Constraints section at the top before adding any new backend feature**
