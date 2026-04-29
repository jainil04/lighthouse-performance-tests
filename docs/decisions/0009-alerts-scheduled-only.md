# ADR 0009 — Alerts fire for scheduled audits only (v1)

**Status:** Accepted  
**Date:** 2026-04-28  
**Deciders:** Jainil Chauhan  

---

## Context

Phase 3 adds threshold-based email alerts: when a metric score breaches a user-configured threshold, an email is sent. The system has two audit paths:

1. **On-demand audits** — triggered manually by the user from the UI. The user is present, watching progress in real time, and sees the result the moment the audit completes. The entire session is foreground and interactive.

2. **Scheduled audits** — triggered by BullMQ jobs on a cron schedule (daily/weekly/monthly). The user is not present. Results land in the database and appear in `/history` the next time the user checks. There is no foreground session.

The question: should `checkAlerts()` fire after both paths, or only after scheduled audits?

---

## Decision

In v1, `checkAlerts()` is called **only from `backend/workers/auditWorker.js`**, after a scheduled audit completes and `persistAuditRun()` succeeds.

`api/lighthouse.js` does **not** call `checkAlerts()`. On-demand audits do not trigger email alerts.

---

## Rationale

The purpose of email alerts is to surface regressions **when nobody is watching**. That condition is only true for scheduled audits. Sending an email about an on-demand audit result the user just finished watching is redundant at best and noisy at worst — the user already knows the score because they're looking at it.

More precisely:

| Audit path | User is present? | Alert adds value? |
|---|---|---|
| On-demand | Yes — result is on screen | No — user already sees it |
| Scheduled | No — result lands silently | Yes — this is the only signal |

Alerting on on-demand audits would also create asymmetric behavior: a user who manually runs an audit to check a site after a deploy would receive an email for every single run, regardless of whether the result is surprising. Alert fatigue from expected runs would degrade trust in alerts from unexpected regressions.

---

## Reversibility

Enabling on-demand alerts later requires **no schema change**. The `alert_configs`, `alert_events`, and `checkAlerts()` function are provider-agnostic with respect to the audit path. The only change needed is adding a `checkAlerts()` call in `api/lighthouse.js` after `persistAuditRun()`, mirroring what the worker already does. The decision surface is one line.

---

## Known UX gap

A user who **only runs on-demand audits and never configures a schedule** will configure alert thresholds and receive no emails, ever. This is a silent failure from the user's perspective — they believe alerts are active, but nothing will ever trigger.

**Mitigation (required, not optional):** The alert configuration UI in `HistoryView.vue` must display an inline notice when `scheduled_audits_enabled` is `false` for the active URL filter:

> "Alerts only fire for scheduled audits. Enable a schedule above to receive alerts."

This notice must appear adjacent to the alert config UI, not hidden in a help modal. If the user cannot see it without hunting for it, it does not mitigate the failure.

The inline notice is load-bearing for this decision. Without it, ADR 0009's "alerts are scheduled-only" behavior is invisible to users, which is unacceptable.

---

## Alternatives considered

### A) Fire alerts from both on-demand and scheduled audits

Wire `checkAlerts()` in both `api/lighthouse.js` and `backend/workers/auditWorker.js`.

Rejected because:
- On-demand alerts are redundant — the user is watching the result live.
- Creates alert fatigue: every manual audit triggers an email if the score happens to be below threshold. A developer running 5 test audits against a staging URL would receive 5 emails.
- Obscures the semantic meaning of "alert." If an alert fires predictably on every manual run, it loses its signal value as a regression detector.

### B) Fire alerts from on-demand only; skip scheduled

Rejected outright. This is the reverse of the right behavior. Scheduled audits are the only path where the user has no other visibility into results. Alerting on the foreground path and silencing the background path would be backwards.

### C) User-configurable: each alert config carries an `audit_path` field (`'scheduled' | 'on_demand' | 'both'`)

Add an `audit_path` column to `alert_configs` so users can choose per-threshold.

Deferred, not rejected. The complexity is not justified at this stage — the vast majority of users want alerts for scheduled audits (the use case that prompted the feature). Add `audit_path` granularity in a later phase once the usage pattern is observed. The schema is additive: a single nullable column with a default of `'scheduled'` and no breaking change to existing rows.

---

## Consequences

### Positive

- Alerts have clear semantic meaning: they fire when you weren't watching and something regressed. No false positives from manual runs.
- `checkAlerts()` implementation is simpler — it doesn't need to distinguish caller context; it is simply not called from the on-demand path.
- The worker is already the right place architecturally: it's the persistent process with access to Redis, DB, and time to send email without the 60-second Vercel function timeout.

### Negative

- **Users who only run on-demand audits will never receive alerts.** This is intentional, but it is a capability gap the UX must surface clearly. A user who expects alerts and never receives them is a silent failure.
- **Scheduled audits run at a fixed time (currently 9am in the job's configured timezone).** A regression introduced at 9:01am is not detected until the following day. This is an accepted latency gap for a cron-based system — webhook or continuous monitoring would eliminate it, but neither is in scope.

### Neutral

- The Express backend (`backend/workers/auditWorker.js`) becomes the sole alert-sending path. This reinforces why the Express backend is not throwaway code — it is the only process that runs background work and sends outbound notifications.

---

## Open questions

- **On-demand alert path (Phase 5 candidate).** If users request alerts on manual runs, the path is clear: add `checkAlerts()` to `api/lighthouse.js` after `persistAuditRun()`. No schema change required. Consider adding a user preference toggle rather than hardcoding the behavior.
- **Timezone for scheduled alerts.** BullMQ's `repeat: { pattern: schedule }` uses UTC by default. An alert about a 9am UTC run fires at 9am UTC regardless of the user's timezone. This is not addressed in v1 — all alerts are UTC-anchored.
- **Idempotency across retries.** If the worker crashes after inserting the `alert_events` row but before sending the email, the retry path re-attempts the send and updates `email_sent_at`. This is the correct behavior, documented in `checkAlerts.js`.

---

## References

- `backend/workers/auditWorker.js` — where `checkAlerts()` is called (after `persistAuditRun()`)
- `api/lib/checkAlerts.js` — the alert evaluation and email dispatch logic
- `src/views/HistoryView.vue` — alert config UI; inline notice for missing schedule
- `docs/ROADMAP.md` — Phase 3: Notifications
- ADR 0001 — why the worker lives in the Express backend, not Vercel
