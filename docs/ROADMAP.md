# Lighthouse Monitor — Roadmap

## What this document is

This is the canonical, living roadmap for Lighthouse Monitor. It tracks what's shipped, what's actively being built, and what's deliberately out of scope. It is the single source of truth for sequencing decisions — if you're wondering what to build next, start here. For the *why* behind major technical decisions, see the ADRs in `docs/decisions/`. For a deep-dive on system architecture, see `docs/architecture.md`. This file is the *what* and *when*.

---

## Project goals

- Be a real, deployed tool a developer would use to track Core Web Vitals over time — not a toy demo
- Demonstrate full-stack engineering depth: data modeling, async job processing, auth, observability, and real-time streaming
- Serve as a portfolio anchor for senior full-stack engineering interviews, with every decision documented and explainable

---

## Design constraints — read before adding features

These are architectural facts that must inform any new backend work. They are not preferences — violating them creates integration failures that are silent until production.

- **BullMQ workers cannot run inside Vercel serverless functions.** Workers are persistent processes; serverless functions terminate after `res.end()`. Scheduled jobs require a separate always-on service (the Express backend deployed to Railway/Render, or a dedicated worker process). → [ADR 0001](decisions/0001-dual-deployment-vercel-serverless-and-express.md)

- **Postgres connections in `api/` must use a serverless-compatible driver.** Standard `pg` connection pools don't survive cold starts. Use the Neon serverless driver (`@neondatabase/serverless`) or pgBouncer in transaction mode. A regular pool will exhaust connections silently under load.

- **JWT middleware must be added to both `api/` and `backend/` — not one or the other.** The parity rule requires both backends to enforce identical auth. `streamLighthouseAudit()` in `src/utils/lighthouseApi.js` must forward the `Authorization` header; `App.vue` must carry auth state via `provide`. → [ADR 0001](decisions/0001-dual-deployment-vercel-serverless-and-express.md)

---

## Status legend

| Marker | Meaning |
|--------|---------|
| ✅ | Shipped |
| 🚧 | In progress |
| 📋 | Planned, not started |
| 💭 | Considered, deliberately deferred (links to ADR where applicable) |
| ❌ | Out of scope — deliberate choice, not backlog |

---

## Phases

### Phase 0 — Foundation ✅ Complete

*Purpose: get the codebase and its documentation honest and internally consistent before adding any new feature surface area.*

**Documentation**
- ✅ Hierarchical `CLAUDE.md` system — root + `api/`, `backend/`, `src/`, composables, components subdirectories
- ✅ `docs/architecture.md` — system narrative, Mermaid topology diagram, SSE sequence diagram, bottleneck analysis, glossary
- ✅ `docs/decisions/0001-dual-deployment-vercel-serverless-and-express.md` — dual-backend rationale, Chrome binary problem, BullMQ inflection point
- ✅ `docs/decisions/0005-multi-run-aggregation-strategy.md` — scores/metrics averaged across runs, opportunities taken from run 1 only; asymmetry documented and deferred (see ADR 0005)
- ✅ `.claude/commands/` — `add-endpoint.md`, `add-vue-component.md`, `review-pr.md`

**Cleanup**
- ✅ Removed `LC_ALL=C` from `vercel.json` (code-level setter is the single source of truth)
- ✅ Removed dead `/audit/stream` legacy route from `vercel.json`
- ✅ Removed unused `import fs from 'fs'` in `api/lighthouse.js`
- ✅ Deleted dead serverless functions: `api/audit.js` (superseded by `lighthouse.js`), `api/health.js`, `api/status.js` — reduces deployed function count from 14 → 11, under Vercel Hobby plan's 12-function limit (currently 8 after Phase 3 added `api/alerts.js`)

**Definition of done:** ✅ Phase 0 is complete. All docs are written, inconsistencies are resolved, and the codebase matches its documentation.

---

### Phase 1 — Persistence + Identity ✅ Complete (2026-04-27)

*Purpose: turn this from a stateless, tab-scoped tool into a real full-stack application with users and durable audit history. This is the phase that makes everything else possible.*

**Data layer**
- ✅ Postgres database — Neon free tier (`@neondatabase/serverless`; HTTP-based driver, no pgBouncer needed)
- ✅ Schema: `users`, `targets` (URLs under monitoring), `runs` (one row per audit execution), `metrics` (one row per metric per run), `run_artifacts` (full Lighthouse JSON for full-report view)
- ✅ Migration tooling — `node-pg-migrate`; migration files in `migrations/`; scripts: `npm run db:migrate`, `npm run db:migrate:down`, `npm run db:migrate:create`

**API**
- ✅ `POST /api/auth/signup` — email + password; bcrypt hashing (cost 10); returns JWT (7-day access token)
- ✅ `POST /api/auth/login` — verifies credentials; returns JWT (7-day access token; no refresh token — deferred)
- ✅ `GET /api/auth/check-email` — returns `{exists: boolean}`; used by the three-step auth UI to determine login vs. signup flow
- ✅ JWT middleware (`api/lib/auth.js` → `verifyToken()`) — validates `Authorization: Bearer <token>`; used in `api/lighthouse.js` (optional) and `api/history.js` (required). `backend/server.js` also applies `requireAuth` to `/api/lighthouse` (parity gap is closed; auth middleware is shared from `api/lib/auth.js`).
- ✅ `POST /api/lighthouse` — wired to persist each run to `runs` + `metrics` tables for authenticated users; guests run normally with no persistence (see [ADR 0007](decisions/0007-auth-optional.md))
- ✅ `GET /api/history` — paginated audit history for the authenticated user, filterable by URL; returns scores + Core Web Vitals per run

**Frontend**
- ✅ Login / signup views (`AuthView.vue`) — three-step flow: email → check-email → login or signup
- ✅ Auth state in `App.vue` — `user`, `token`, `login()`, `logout()` provided via `inject` to all children
- ✅ `lighthouseApi.js` forwards `Authorization` header when a token is present in `localStorage`
- ✅ `/history` route + `HistoryView.vue` — paginated table of past audits with score badges and CWV threshold badges; URL filter
- ✅ `useAuditHistory` composable — fetches and paginates history from `GET /api/history`; backs the history view
- ✅ Router guards — `/history` redirects to `/auth` if not authenticated; `/auth` redirects to `/` if already authenticated

**Post-Phase-1 improvements**
- ✅ `runs_count` saved to `runs` table equals N (user-requested count), not N+1 — accurate audit count in history
- ✅ Warmup run discarding — always run N+1, discard first result; warms Chrome + DNS before real runs (see [ADR 0006](decisions/0006-warmup-run-discarding.md))
- ✅ Full metrics persistence — 4 category scores + 6 Core Web Vitals (FCP, LCP, CLS, TBT, SI, TTI) saved per run; all displayed in history table
- ✅ `useAuditNotification` composable — "Audit complete ✓" badge on audit completion; 2-second auto-dismiss using Page Visibility API (timer pauses while tab is hidden)

**Definition of done:** ✅ A logged-in user can run an audit, close the tab, return to `/history`, and see the saved result — all wired through Neon Postgres in production, deployed on Vercel.

---

### Phase 2 — Async + Scheduled Work ✅ Complete (2026-04-28)

*Purpose: introduce background job processing — the area where senior-level backend depth is most visible. Audits become proactive rather than reactive.*

**Infrastructure**
- ✅ Redis — Upstash/Railway free tier, using `KV_URL` via ioredis TCP connection
- ✅ BullMQ worker — persistent process in `backend/workers/auditWorker.js`, started via dynamic import in `backend/server.js`; listens on queue named `audit`; 3 retries with exponential backoff
- ✅ `POST /api/jobs` — enqueue a scheduled audit; returns job ID. Also `GET /api/jobs` returns scheduled targets for the user.
- ✅ DB migration `1777409249711_add-schedule-column` — adds `schedule TEXT` and `scheduled_audits_enabled BOOLEAN NOT NULL DEFAULT FALSE` to `targets`

**Features**
- ✅ Scheduled audits — cron-style configuration per target URL, UI in `HistoryView.vue` with Daily/Weekly/Monthly presets; shows "Scheduled ✓" badge when active; fetches existing schedules on mount via `GET /api/jobs`; enforced server-side whitelist of allowed cron strings; max 5 scheduled URLs per user enforced in both `api/jobs.js` and the UI
- ✅ BullMQ repeatable jobs — `api/jobs.js` uses `repeat: { pattern: schedule }` so jobs re-enqueue automatically on the cron schedule
- ✅ Trend visualization — line chart of Performance, FCP, LCP, CLS, TBT over time, shown in `HistoryView.vue` when a URL filter is active and 2+ runs exist
- ✅ Regression detection — `regressionMap` computed property in `HistoryView.vue` compares the most recent run against the average of all previous runs for the filtered URL; renders an exclamation-triangle icon on regressed metric badges in the most recent row only; thresholds: score metrics ≥10 point drop, time metrics ≥20% increase, CLS ≥0.1 increase

**Definition of done:** ✅ A user can configure a URL to audit daily; the next morning, results appear in history without the user having triggered anything; the trend chart shows at least two data points with a visible regression indicator if scores dropped.

---

### Phase 3 — Notifications + Sharing (~1 week)

*Purpose: make the tool useful when the user isn't watching, and shareable when they want to show results to a colleague or client.*

**Notifications**
- ✅ Email alerts when a user-defined score threshold is breached — Resend transactional email; fires on scheduled audits only (2026-04-28, see [ADR 0008](decisions/0008-email-provider-resend.md) and [ADR 0009](decisions/0009-alerts-scheduled-only.md))
- ✅ Alert config per target URL: user sets threshold + comparison per metric (e.g., "alert me if Performance drops below 70"); `alert_configs` + `alert_events` tables; `checkAlerts()` in `api/lib/`; UI in `HistoryView.vue` (2026-04-28)

**Sharing**
- 📋 Public shareable report URLs at `/r/<slug>` — read-only, no auth required
- 📋 Time-limited and revocable share links — expiry stored in Postgres; middleware rejects expired slugs

**Definition of done:** A score drop triggers an email within 15 minutes of the scheduled audit completing; the email contains a share link that a recipient can open without an account.

---

### Phase 4 — Operational Maturity (~1 week)

*Purpose: signal senior-level operational thinking. The difference between "it works on my machine" and "it's production-grade."*

**Reliability**
- 📋 Rate limiting — Redis-backed token bucket per authenticated user; per-IP bucket for unauthenticated requests; `429` responses with `Retry-After` header
- 📋 Health endpoint that checks DB + Redis connectivity, not just returns `200` — used by uptime monitoring
- 📋 Audit cancellation — `DELETE /api/jobs/:id` stops an in-progress scheduled audit; in-progress on-demand audits are cancelled via SSE close detection

**Observability**
- 📋 Structured logging via `pino` — JSON logs with request IDs propagated through the stack
- 📋 Sentry error tracking — exceptions in both serverless functions and the BullMQ worker
- 📋 OpenAPI spec — auto-generated or hand-written; documents all endpoints including SSE event schema

**Definition of done:** A 500 in production produces a Sentry alert within 60 seconds; a user who hits the rate limit gets a `429` with a clear retry window; the health endpoint is green in an uptime monitor.

---

### Phase 5 — Differentiators (months 3–6, optional)

*Purpose: pick from this menu based on what's interesting and what gaps remain. None of these are required to call the project "complete." Each item is independently shippable.*

- 📋 Webhook notifications — HMAC-signed payloads to user-configured URLs; retry queue with exponential backoff
- 📋 Team workspaces — multi-tenancy with row-level scoping (`team_id` foreign keys; app-layer guards or Postgres RLS)
- 📋 Programmatic API keys — scoped permissions, rotate / revoke; enables the CLI use case
- 📋 CLI tool — `npx lighthouse-monitor audit <url> --token=...` wrapping the existing API
- 📋 GitHub Action wrapper — run an audit in CI, post score summary to the PR
- 📋 Performance budgets — declarative thresholds (`lighthouse-budget.json`) checked in CI; fail the build on violation
- 📋 Multi-region audits — run from US-East, EU-West, and Asia; surface geographic variance in the results

---

## Out of scope (deliberate)

- ❌ **Stripe / payments** — too much surface area (webhooks, failed charge handling, subscription state) for minimal learning value at this stage
- ❌ **Mobile app / React Native** — an iOS project already covers native mobile in the portfolio
- ❌ **GraphQL layer** — REST + SSE is sufficient; adding GraphQL to add GraphQL is complexity without purpose
- ❌ **Microservices split** — a well-structured monolith beats a fragmented system at this scale; split when a seam genuinely justifies it
- ❌ **Kubernetes deployment** — Vercel + Fly.io / Railway is the right hosting tier for this project's lifetime
- ❌ **Custom-trained AI models** — calling OpenAI is sufficient; fine-tuning would be a months-long detour for marginal gain
- ❌ **WebSockets** — SSE is unidirectional and HTTP-native; the right tool for this use case (see `docs/decisions/0002-sse-not-websockets.md`)
- ❌ **Pinia / Vuex** — `provide`/`inject` in `App.vue` is sufficient while the state surface is small (see `docs/decisions/0004-no-state-manager.md`)
- ❌ **ESLint / Prettier** — add when team size or contributor count justifies it; not a solo-project priority

---

## Cross-cutting practices

These apply continuously across all phases, not gated to any single one:

- Write an ADR in `docs/decisions/` for every non-trivial technical decision (new infra dependency, significant trade-off, deferred alternative)
- Update `docs/architecture.md` when the system shape changes — new services, new data flows, new bottlenecks
- Update the relevant `CLAUDE.md` file when a new convention establishes (new composable pattern, new API handler pattern, new component layer rule)
- Keep `README.md` in sync with what's actually shipped — no aspirational claims in the README
- Tests accompany feature work. New routes get integration tests; new business logic gets unit tests. Phase 1 (auth + DB) is the hard floor — no auth/DB code lands without tests covering it. Earlier phases can be lighter on coverage, but no phase ships without tests of its critical paths.

---

## How to use this file

**For future me / future Claude Code sessions:** work top-down through phases. Don't skip ahead to Phase 2 because it sounds interesting if Phase 1 isn't done — Phase 2 depends on Phase 1's auth and DB layer. The exception: if a specific Phase 1 item is blocked and a Phase 2 item is genuinely independent, note it explicitly. When in doubt, finish the current phase before starting the next.

**When something ships:** update its marker to ✅ in the same commit as the feature. Add the commit SHA or PR link as a parenthetical if useful. If the shipped item changes what comes next (e.g., a decision made during implementation), update the relevant downstream items in the same commit and open an ADR if the decision was non-trivial.
