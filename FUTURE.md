# FUTURE.md

Planned features for the next 6 weeks. Read this before designing any new backend system — these decisions affect architecture choices you make today.

## Planned

### Postgres + user history
- Store audit results per user; display run history with trend charts
- Implies: a `db/` layer, migration tooling (likely `node-postgres` or Drizzle), a `results` table schema
- Affects: `api/` handlers will need DB connection pooling compatible with serverless (pgBouncer or Neon serverless driver)

### JWT authentication
- Email/password login; JWT issued on login, verified on all protected endpoints
- Implies: `users` table, password hashing (bcrypt), JWT middleware in both `api/` and `backend/`
- Affects: `streamLighthouseAudit()` in `lighthouseApi.js` needs to forward the auth header; `App.vue` needs auth state

### BullMQ scheduled jobs
- Users schedule recurring audits (e.g. "run every day at 9am")
- Implies: Redis instance, a BullMQ worker process, a job queue API (`POST /api/jobs`)
- **Critical constraint**: BullMQ workers are persistent processes — they cannot run inside Vercel serverless functions. This will require either a separate worker service (Railway/Render) or a full move of the backend to Express + a process manager. See `docs/decisions/0001-dual-deployment-vercel-serverless-and-express.md`.

### User audit history UI
- New view (`/history`) showing past runs with score trends over time
- Implies: new route in `src/router/index.js`, new view, likely a `useAuditHistory` composable backed by API calls

## Not planned (explicitly deferred)

- WebSockets (SSE is sufficient — see `docs/decisions/0002-sse-not-websockets.md`)
- Pinia/Vuex (provide/inject is sufficient — see `docs/decisions/0004-no-state-manager.md`)
- ESLint/Prettier (add only when team size justifies it)
- Unit/integration tests (add before auth/DB work begins)
