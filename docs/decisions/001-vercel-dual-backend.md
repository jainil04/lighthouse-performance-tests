# ADR 001 — Vercel serverless + Express dual backend

## Status
Accepted

## Context
Lighthouse requires a headless Chrome instance. This can be run in a serverless function (with a pre-built Chromium binary) or in a persistent Express server (using the local system Chrome). Both approaches have different tradeoffs for cost, cold start latency, and deployment complexity.

## Decision
Maintain two backend modes:
- **`/api/`**: Vercel serverless, primary deployment. Uses `@sparticuz/chromium` — a stripped Chromium build designed for Lambda-style environments.
- **`/backend/`**: Express server, alternative deployment. Uses `chrome-launcher` to find local system Chrome.

The frontend communicates via identical SSE-over-POST semantics with both. Switching is done by changing the Vite proxy target.

## Rationale
- Vercel serverless is zero-ops for a portfolio project — no server to manage
- Express backend gives a viable escape hatch if Vercel's 60s timeout or 1024MB RAM becomes a constraint as features grow (scheduled jobs, heavier audits)
- Parity between the two is enforced as a rule, not a build check — this is a known fragility

## Consequences
- **Positive**: Flexibility to deploy anywhere; no vendor lock-in at the infra layer
- **Negative**: Two codepaths to maintain; divergence risk if parity rule is not followed
- **Watch**: When BullMQ scheduled jobs are added (see `FUTURE.md`), they require a persistent process — Vercel serverless cannot run them. This will force either a split architecture (Vercel for on-demand audits, separate worker for scheduled) or a full move to Express + a process manager.
