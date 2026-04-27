# ADR 0006 — Warmup run discarding

**Status:** Accepted  
**Date:** 2026-04-27  
**Deciders:** Jainil Chauhan

---

## Context

Lighthouse audits run inside a Puppeteer-managed Chrome instance. The first audit run after Chrome launches consistently produces inflated (slower) metrics compared to subsequent runs. The causes are:

- **Cold DNS**: the first navigation to the target URL performs a DNS lookup; subsequent runs hit the OS cache.
- **Cold TCP / TLS**: the first connection to the target server completes the full TCP handshake and TLS negotiation; warm connections reuse the established session.
- **V8 JIT cold start**: JavaScript on the target page is interpreted on first load; subsequent loads benefit from JIT-compiled code cached in V8.
- **Network prefetch**: Chromium may speculatively prefetch subresources after the first load; the second load sees lower latency on those resources.

These effects make the first run a systematic outlier — not a random one. Its metrics are not representative of what a real visitor to the site would experience on a warm connection.

The problem surfaces most clearly in multi-run mode (N ≥ 2): if the warmup run is included in the average, the average is pulled toward worse (slower) values than the steady-state reality. For single-run mode the effect is even worse: the user sees only the cold outlier with no other runs to dilute it.

---

## Decision

Always run one extra audit (N+1 total) before the N user-requested runs. Discard the first result completely. Only the N subsequent runs contribute to results, averages, and DB persistence.

The warmup is silent to the user:

- No `run-complete` event is emitted for the warmup run.
- The warmup result is never added to `runResults`, `lhrObjects`, or any data structure passed to `calculateAverages()` or `persistAuditRun()`.
- `runs_count` written to the `runs` DB table equals N (the user-requested count), not N+1.
- Progress during the warmup is absorbed into the browser-initialization phase (0–30%), which `prepareBrowser()` already covers. No additional progress events are emitted for the warmup itself.

**Implementation:** `api/lighthouse.js` — `runWarmupAudit()` function called after `prepareBrowser()` and before the real-runs `for` loop.

---

## Alternatives considered

### A) Warn the user that run 1 is a warmup (status quo before this change)

Present all N runs in results and add UI copy explaining cold-start bias on run 1.

Rejected because:
- Shifts complexity and cognitive load to the user. Most users don't understand cold DNS / V8 JIT warmup; the warning becomes noise.
- The first-run bias is systematic and predictable — it's not signal the user should interpret, it's noise the tool should remove.

### B) Discard only when N ≥ 2

Run exactly N audits for N=1, run N+1 (discard first) for N ≥ 2.

Rejected because:
- Creates an inconsistency: a user who runs 1 audit gets a cold-start result; a user who runs 2 audits gets warm averages. The 1-run case is the most common and should be the most accurate.
- The extra run cost (one additional Lighthouse execution) is the same regardless of N. There's no cost argument for treating N=1 differently.

### C) Re-run until variance is below a threshold

Run audits in a loop until consecutive runs are within X% of each other, cap at some maximum.

Rejected because:
- Non-deterministic execution time. The Vercel 60-second timeout is already the primary constraint; an adaptive loop makes timeout risk unpredictable.
- Over-engineering for a problem that a single discarded warmup already solves well enough for the use case.

### D) Average the first run at a lower weight (e.g., 0.5×)

Include run 1 but weight it less than subsequent runs.

Rejected because:
- Arbitrary weighting is harder to explain and test than a clean discard.
- The result is still biased; only the magnitude changes.

---

## Consequences

### Positive

- All N user-facing runs reflect warm-cache, warm-connection conditions that better represent steady-state site performance.
- The reported averages are more stable and reproducible across multiple audit sessions.
- The warmup is invisible — the UX is simpler because there's nothing to explain.

### Negative

- **Total execution time increases by ~one Lighthouse run duration** (~5–25 seconds depending on the target site). This is particularly significant for Vercel's 60-second timeout: a 3-run audit on a slow site that was previously right at the limit may now exceed it. Users who need the full accuracy benefit on slow sites may need to reduce N or use the Express backend.
- The warmup run is not reflected in `runs_count` in the database, so the stored count is the user's intention, not the actual execution count. This is intentional and correct but worth noting.

### Neutral

- The warmup run's `lhr` object is never stored, so memory usage for the warmup is bounded by the Lighthouse result's GC cycle, not by `lhrObjects` growth.

---

## References

- `api/lighthouse.js` — `runWarmupAudit()`, `persistAuditRun()`, `calculateAverages()`
- `docs/ROADMAP.md` — Phase 1 post-phase improvements
- ADR 0005 — multi-run aggregation strategy (discusses which run data is used for opportunities/diagnostics)
