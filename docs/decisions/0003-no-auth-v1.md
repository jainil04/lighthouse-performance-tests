# ADR 0003 — No authentication in v1

## Status
Accepted (deferred)

## Context
The tool is currently stateless — any visitor can run an audit. No user accounts, no saved history, no rate limiting.

## Decision
Ship v1 without authentication.

## Rationale
- Portfolio anchor project: the primary goal is demonstrating performance engineering and full-stack architecture, not auth implementation
- No user data to protect in v1 — results are ephemeral, displayed in-browser only
- Adding JWT auth, session management, and a users table before the core product is stable adds complexity with no user-facing value

## Consequences
- **Positive**: Faster iteration; no auth bugs; simpler API handlers
- **Negative**: No rate limiting — the API is open to abuse; Lighthouse + Chrome are expensive per-invocation
- **Planned**: JWT auth + Postgres users table is on the roadmap (see `FUTURE.md`). When added: `api/` handlers gain a JWT middleware layer; `backend/` gains the same middleware to maintain parity. Auth headers need to flow through `streamLighthouseAudit()` in `lighthouseApi.js`.
