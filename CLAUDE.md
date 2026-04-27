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
              ↓
          Puppeteer → Chrome → Lighthouse → lhr → SSE events → frontend refs
```

| Layer | Path | Chrome strategy | Details |
|---|---|---|---|
| Vercel serverless | `api/` | `puppeteer-core` + `@sparticuz/chromium` | `api/CLAUDE.md` |
| Express server | `backend/` | `chrome-launcher` (local system Chrome) | `backend/CLAUDE.md` |
| Vue 3 SPA | `src/` | — | `src/CLAUDE.md` |

## Cross-cutting rules

- **ESM only** — `"type": "module"` in both `package.json` files. No `require()`.
- **Node 22.x** required.
- **No state manager** — global state is `ref` + `provide` in `App.vue`. No Pinia/Vuex.
- **No test framework** — don't scaffold tests without explicit instruction.
- **No linter/formatter** — ESLint/Prettier not configured. Don't add them without asking.

## Environment variables

```
OPENAI_API_KEY    # Required for /api/ai-summary (GPT-4.1)
```

`VITE_API_URL` and all `HF_*` Hugging Face vars exist in `.env` but are unused — ignore them.

## Deployment

`vercel.json`: `api/*.js` → `@vercel/node`, 60s timeout, 1024MB RAM. Frontend → `@vercel/static-build`. Catch-all route `/api/(.*)` → `/api/$1.js`.

## Further reading

- Architecture narrative + data flow diagram: `docs/architecture.md`
- Decision records (SSE vs WebSockets, dual backend, no auth, no state manager): `docs/decisions/`
- Planned features (Postgres, JWT auth, BullMQ, user history): `FUTURE.md` — **read before designing any new backend system**
