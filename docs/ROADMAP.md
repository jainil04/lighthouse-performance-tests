# Lighthouse Monitor — Roadmap

## What this document is

This is the canonical, living roadmap for Lighthouse Monitor. It tracks what's shipped, what's actively being built, and what's deliberately out of scope. It is the single source of truth for sequencing decisions — if you're wondering what to build next, start here. For the *why* behind major technical decisions, see the ADRs in `docs/decisions/`. For a deep-dive on system architecture, see `docs/architecture.md`. This file is the *what* and *when*.

---

## Project goals

- Be a real, deployed tool a developer would use to track Core Web Vitals over time — not a toy demo
- Demonstrate full-stack engineering depth: data modeling, async job processing, auth, observability, and real-time streaming
- Serve as a portfolio anchor for senior full-stack engineering interviews, with every decision documented and explainable

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
- ✅ Removed unused `import fs from 'fs'` in `api/lighthouse.js` and `api/audit.js`

**Definition of done:** ✅ Phase 0 is complete. All docs are written, inconsistencies are resolved, and the codebase matches its documentation.

---

### Phase 1 — Persistence + Identity (~2 weeks)

*Purpose: turn this from a stateless, tab-scoped tool into a real full-stack application with users and durable audit history. This is the phase that makes everything else possible.*

**Data layer**
- 📋 Postgres database — Neon free tier (serverless-compatible driver; no pgBouncer needed at this scale)
- 📋 Schema: `users`, `targets` (URLs under monitoring), `runs` (one row per audit execution), `metrics` (one row per Core Web Vital per run), `run_artifacts` (full Lighthouse JSON for full-report view)
- 📋 Migration tooling — `node-pg-migrate` or Prisma migrations; migration files committed alongside schema changes

**API**
- 📋 `POST /api/auth/signup` — email + password; bcrypt hashing; returns JWT
- 📋 `POST /api/auth/login` — verifies credentials; issues access + refresh tokens
- 📋 JWT middleware — validates `Authorization: Bearer <token>` on protected routes in both `api/` and `backend/`
- 📋 `POST /api/lighthouse` — existing handler wired to persist each run to `runs` + `metrics` tables for authenticated users
- 📋 `GET /api/history` — paginated audit history for the authenticated user, filterable by URL / date range / score range

**Frontend**
- 📋 Login / signup views + auth state in `App.vue` (provided via `inject`)
- 📋 `lighthouseApi.js` forwards `Authorization` header on all audit requests
- 📋 `/history` route + `HistoryView.vue` — paginated table of past audits with score badges
- 📋 `useAuditHistory` composable — fetches and caches history; backs the history view

**Definition of done:** A logged-in user can run an audit, close the tab, return to `/history`, and see the saved result — all wired through Postgres in production, deployed on Vercel + Neon.

---

### Phase 2 — Async + Scheduled Work (~2 weeks)

*Purpose: introduce background job processing — the area where senior-level backend depth is most visible. Audits become proactive rather than reactive.*

**Infrastructure**
- 📋 Redis — Upstash free tier (serverless-compatible; HTTP-based client works inside Vercel functions for enqueue; worker runs in Express)
- 📋 BullMQ worker — separate persistent process (Express-based) that consumes the audit queue; cannot run inside Vercel serverless (see [ADR 0001](decisions/0001-dual-deployment-vercel-serverless-and-express.md))
- 📋 `POST /api/jobs` — enqueue a scheduled audit; returns job ID

**Features**
- 📋 Scheduled audits — cron-style configuration per target URL ("run every day at 09:00")
- 📋 Trend visualization — line charts of FCP / LCP / CLS / TBT over time per saved URL, rendered in the history view
- 📋 Regression detection — visual callout when a metric degrades by more than a configurable threshold vs. the rolling baseline

**Definition of done:** A user can configure a URL to audit daily; the next morning, results appear in history without the user having triggered anything; the trend chart shows at least two data points with a visible regression indicator if scores dropped.

---

### Phase 3 — Notifications + Sharing (~1 week)

*Purpose: make the tool useful when the user isn't watching, and shareable when they want to show results to a colleague or client.*

**Notifications**
- 📋 Email alerts when a user-defined score threshold is breached (Resend or Postmark — transactional email, not marketing)
- 📋 Alert config per target URL: user sets threshold per category (e.g., "alert me if Performance drops below 70")

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

---

## How to use this file

**For future me / future Claude Code sessions:** work top-down through phases. Don't skip ahead to Phase 2 because it sounds interesting if Phase 1 isn't done — Phase 2 depends on Phase 1's auth and DB layer. The exception: if a specific Phase 1 item is blocked and a Phase 2 item is genuinely independent, note it explicitly. When in doubt, finish the current phase before starting the next.

**When something ships:** update its marker to ✅ in the same commit as the feature. Add the commit SHA or PR link as a parenthetical if useful. If the shipped item changes what comes next (e.g., a decision made during implementation), update the relevant downstream items in the same commit and open an ADR if the decision was non-trivial.
