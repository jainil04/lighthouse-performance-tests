# Architecture Decision Records

ADRs are short, dated documents that capture *why* a non-trivial technical decision was made — for the next engineer who asks "why did they do it this way?" and for interview prep where trade-off articulation matters. Each ADR has a status: **Proposed** (surfaced, not yet acted on), **Accepted** (the decision stands), **Deprecated** (no longer relevant), or **Superseded by ADR-NNNN** (replaced).

To add a new ADR: copy the structure from an existing one, pick the next number, write Context → Decision → Alternatives → Consequences → Open Questions. Status starts as Proposed until you're happy with it.

---

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-dual-deployment-vercel-serverless-and-express.md) | Dual-mode deployment: Vercel serverless (`/api/`) + Express (`/backend/`) — why two backends exist, the Chrome binary problem, and the BullMQ inflection point | Accepted |
| [0002](0002-sse-not-websockets.md) | SSE over WebSockets for audit streaming | Accepted |
| [0003](0003-no-auth-v1.md) | No authentication in v1 | Superseded by ADR 0007 |
| [0004](0004-no-state-manager.md) | provide/inject instead of Pinia | Accepted |
| [0005](0005-multi-run-aggregation-strategy.md) | Multi-run aggregation: scores/metrics averaged across runs, opportunities taken from run 1 only — asymmetry documented and deferred | Proposed |
| [0006](0006-warmup-run-discarding.md) | Warmup run discarding — always run N+1, discard first; warm Chrome + DNS before real runs | Accepted |
| [0007](0007-auth-optional.md) | Authentication is optional — guests can run audits; only authenticated users get DB persistence | Accepted |
