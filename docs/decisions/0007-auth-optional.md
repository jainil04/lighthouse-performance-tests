# ADR 0007 — Authentication is optional; guests can run audits

**Status:** Accepted  
**Date:** 2026-04-27  
**Deciders:** Jainil Chauhan  
**Supersedes:** [ADR 0003 — No authentication in v1](0003-no-auth-v1.md)

---

## Context

ADR 0003 deferred authentication entirely, classifying it as a Phase 1 concern. Phase 1 has now shipped JWT auth + Postgres persistence. The question that remained open was the access model: **must a user be logged in to run an audit, or is login optional?**

The original ROADMAP described JWT middleware as applying to "protected routes." The audit endpoint (`POST /api/lighthouse`) sits at an interesting boundary: it is the core product feature, not a data management action. Requiring auth for it would:

1. Block unregistered visitors from experiencing the tool at all — a significant friction increase for a portfolio project.
2. Require every demo link or cold-traffic visitor to create an account before seeing results.
3. Complicate the frontend SSE flow: the fetch in `lighthouseApi.js` would have to redirect or show an auth modal mid-audit if the token expired.

At the same time, there's genuine value in auth: only logged-in users can have their results saved to the database and access audit history.

---

## Decision

Authentication is **optional** on the audit endpoint (`POST /api/lighthouse`). Both guests and authenticated users can run audits. The difference is what happens to the results:

| User type | Can run audit | Results persisted to DB | `/history` accessible |
|-----------|:---:|:---:|:---:|
| Guest (no token) | ✅ | ❌ | ❌ |
| Authenticated | ✅ | ✅ | ✅ |

**Implementation** (`api/lighthouse.js`):

```js
let userId = null
try {
  userId = verifyToken(req).userId
} catch {
  // No valid token — audit runs normally, results not persisted
}
```

`verifyToken` throws for missing or invalid tokens. The catch block swallows the error and leaves `userId = null`. At the end of the handler, `persistAuditRun` is called only when `userId !== null`:

```js
if (userId && runResults.length > 0 && finalScores) {
  await persistAuditRun(...)
}
```

Auth-only endpoints (`GET /api/history`, all `/api/auth/*`) are strict — they return `401` without a valid token.

**Frontend** (`src/utils/lighthouseApi.js`): includes `Authorization: Bearer <token>` if `localStorage.getItem('lh_token')` is set. No token in storage → no header sent → guest mode.

---

## Alternatives considered

### A) Require auth for all audits (original ROADMAP plan)

Every audit request must include a valid JWT. No token → `401` immediately.

Rejected because:
- First-time visitors cannot try the tool without signing up. This is too high a friction wall for a portfolio demo project.
- The tool's core value proposition (run an audit, see results instantly) should not require account creation.
- If a token expires mid-session, the user must re-authenticate before continuing — a jarring experience for an audit that takes 10–60 seconds.

### B) Guest access with a temporary session token (e.g., anonymous auth)

Generate an ephemeral guest token on first visit; associate results with the guest session; allow upgrade to a real account later.

Rejected because:
- Adds significant complexity: session store or cookie-based tracking, upgrade-account flow, cleanup of orphaned guest records.
- Guest data most users never claim is table clutter.
- The main use cases for persistence (bookmarking a URL, tracking trends over time) are inherently account-linked; transient guests don't benefit from anonymous persistence.

### C) Auth optional now, with a path to require it later

Ship optional auth (this decision), but add rate limiting per IP for guests, and add a configurable flag to make auth required. Revisit after seeing guest vs. authenticated traffic ratio.

This is the right long-term direction but not implemented yet — rate limiting is a Phase 4 item. The flag is not built. This alternative is captured here as an open question rather than a deferred rejection.

---

## Consequences

### Positive

- Zero friction for new visitors — the portfolio demo link works immediately.
- Authenticated users get the full experience (history, persistence) without losing the instant-gratification onboarding path.
- Simpler error handling in the frontend: the SSE stream never has to deal with mid-audit auth failures.

### Negative

- **No rate limiting on guest audits.** Any visitor can trigger a 60-second Chrome invocation with no account, no quota, no cost. The realistic failure mode is Vercel usage bills on a high-traffic day. Phase 4 (rate limiting via Redis) partially mitigates this.
- **Guest results are ephemeral.** If a user runs an audit, sees great results, and then creates an account, their pre-signup audits are not recoverable. There is no retroactive persistence or "merge guest history" flow.
- **The backend (`/backend/` Express) does not enforce JWT on any routes.** Parity with `api/` is incomplete — the Express path has no auth layer at all. This is an acceptable gap while the Express backend remains an alternative deployment rather than the primary path.

### Neutral

- `App.vue` provides `user`, `token`, `login`, and `logout` via `provide` to all children. Components that need to show/hide auth-gated UI inject `user` (null if guest, object if logged in). This pattern is consistent with the existing `provide`/`inject` approach (see ADR 0004).

---

## Open questions

- **Rate limiting.** Without auth-gating, guests have unlimited audit throughput. Phase 4 plans a Redis-backed token bucket per IP. Until then, guest abuse is an accepted risk.
- **Retroactive persistence.** If a user signs up after running guest audits, should the system offer to save their in-tab results? Not currently implemented and not on the roadmap — would require a client-side "upload results" flow.
- **Token refresh.** The current JWT is a single access token with a 7-day expiry — no refresh token, no sliding session. After 7 days the user is silently logged out (the token check in `router.beforeEach` fails; localStorage is stale but not cleared). A refresh token mechanism is deferred.

---

## References

- `api/lighthouse.js` — optional `verifyToken` catch block, conditional `persistAuditRun` call
- `api/lib/auth.js` — `verifyToken()` implementation
- `src/utils/lighthouseApi.js` — conditional Authorization header
- `src/router/index.js` — `/history` guard (requires auth), `/auth` guard (redirects home if already authed)
- `src/App.vue` — `user`, `token`, `login`, `logout` provided via inject
- ADR 0003 — original "no auth in v1" decision (now superseded)
- ADR 0004 — provide/inject state pattern
- `docs/ROADMAP.md` — Phase 4: rate limiting
