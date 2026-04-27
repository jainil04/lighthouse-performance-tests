# ADR 005 — Multi-run aggregation strategy

## Status
Proposed

## Context
When a user runs N audits (1–10), the backend averages results across runs before sending the final `complete` SSE event. The averaging is asymmetric:

- **Scores and numeric metrics** are arithmetically averaged across all N runs. This happens in `calculateAverages()` in `api/lighthouse.js` (lines 392–410).
- **Opportunities and diagnostics** are taken verbatim from run 1 only. The comment at line 412 acknowledges this: `"take from first result since they're not numerical averages"` — but the choice of run 1 is silent and undocumented to the user.

This asymmetry is not surfaced anywhere in the UI. A user running 10 audits sees a performance score and FCP that represent an average of all 10 runs, displayed alongside opportunities and diagnostics that only reflect the first (typically warmest cold-cache) run. The first run is likely to have different conditions than subsequent runs (cold DNS, uncached assets), making it a biased choice.

**Code locations:**
- `api/lighthouse.js`, `calculateAverages()`, lines 377–422: full averaging function
- Lines 392–410: scores and metrics summed then divided by `count`
- Lines 412–414: opportunities and diagnostics assigned from `results[0]` only

## Decision
Defer. Document the current behavior explicitly. Revisit when user history and trend visualization ship — the aggregation strategy matters most when displaying historical run data, and the right answer depends on what question the user is actually asking (consistency? worst case? regression detection?).

No code changes now.

## Alternatives considered

### A) Status quo — run 1 only (current)
- **Simple**: no extra logic, data shape unchanged
- **Biased**: run 1 is often the cold-cache run; its opportunities may not reflect the steady-state behavior the user cares about
- **Silent**: nothing in the UI signals which run the opportunities came from

### B) Use median run
- **Less biased** than run 1 for an odd number of runs; for even N, take lower median
- **Same shape**: no API or frontend changes needed — just change `results[0]` to `results[Math.floor(count / 2)]`
- **Still opaque**: the user doesn't know which run's opportunities they're seeing
- One-day fix when this becomes a priority

### C) Frequency-based aggregation
- Show only opportunities that appeared in ≥ X% of runs (e.g., ≥ 50%); aggregate per-opportunity savings as min/median/max
- **Most honest**: reflects consistent issues rather than one-run noise
- **Requires data shape change**: API response would need per-opportunity run-frequency data; frontend would need to render it
- Couples well with the planned user history feature — frequency data is useful for trend views

## Consequences
- Until revisited, users running multi-run audits receive internally inconsistent results: averaged metrics next to single-run opportunities. This is an acceptable short-term cost for a portfolio project.
- The UI gives no indication that opportunities are run-1-only. If a user notices the inconsistency (e.g., a high-latency opportunity on run 1 that doesn't appear in later runs), it will look like a bug.
- Architecture doc references this ADR wherever multi-run aggregation is described.

## Open questions
- What does the user actually want from a multi-run audit? Median? Worst case? Most consistent issues?
- Should the `complete` event's data shape be extended to surface the choice — e.g., return per-run results alongside aggregated, so the frontend can decide what to display?
- If user history is added (see `FUTURE.md`), should historical opportunity tracking use the same run-1 approach, or is that the forcing function to implement option C?

## References
- `api/lighthouse.js`, `calculateAverages()`, lines 377–422
- `FUTURE.md` — user history and trend visualization planned features
