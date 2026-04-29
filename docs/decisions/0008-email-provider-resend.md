# ADR 0008 — Email provider: Resend

**Status:** Accepted  
**Date:** 2026-04-28  
**Deciders:** Jainil Chauhan  

---

## Context

Phase 3 introduces email alerts: when a scheduled audit breaches a user-configured threshold, the system sends a transactional email. This requires choosing a transactional email provider.

The two realistic candidates for a hobby-scale, portfolio-grade project are **Resend** and **Postmark**. Both are modern REST-based transactional email APIs with Node.js SDKs, good deliverability, and clean developer experience. The decision requires weighing free-tier economics, deliverability reputation, API ergonomics, and the one-way-door nature of domain verification.

### One-way door: domain verification

Whichever provider is chosen, DNS records (SPF, DKIM, DMARC) must be configured for the sending domain. DNS propagation can take up to 48 hours, and once records are in place they establish a sending reputation tied to that provider. Migrating to a different provider later means reconfiguring DNS, waiting for propagation again, and rebuilding the sending reputation from scratch. This is not catastrophic but it is non-trivial — flag it so it isn't re-litigated casually.

---

## Decision

Use **Resend** as the email provider.

**Implementation:**

- Thin wrapper at `api/lib/email.js` exports a single function: `sendAlertEmail({to, url, metric, value, threshold, comparison, runId})`.
- If `process.env.RESEND_API_KEY` is unset (local dev, CI), the function logs the payload and returns `{id: 'dev-stub'}` — it does **not** throw. This means local development and preview deployments work without a real key.
- On Resend API errors, the function throws so the caller (`checkAlerts.js`) can record `email_error` in `alert_events`. The caller is responsible for persisting the error, not this wrapper.
- The `RESEND_API_KEY` environment variable is optional in `vercel.json` — the dev-stub fallback makes it non-blocking.

---

## Alternatives considered

### A) Postmark

Postmark has the strongest deliverability reputation in the transactional email market — it is the default recommendation when inbox placement is critical (SaaS billing emails, password resets, etc.).

Rejected because:
- **Free tier**: Postmark offers a 100-email trial, after which a paid plan is required. For a portfolio project running Daily/Weekly/Monthly scheduled audits across a handful of URLs, the realistic monthly email volume is well under 500 — but Postmark's paid entry point is $15/month for 10,000 emails/month, which is oversized and costs real money.
- **Resend's free tier** is 3,000 emails/month with no credit card required. For this project's volume that is effectively unlimited.
- Postmark's deliverability advantage matters most at volume — a system sending millions of emails sees real inbox-placement differences between providers. At < 500 emails/month, the difference is not meaningfully observable.

### B) SendGrid

SendGrid (Twilio) has a 100-email/day free tier but is significantly more complex to configure (IP pools, subusers, legacy API versions coexisting with v3). The DX is worse than Resend for a simple use case. Rejected on DX grounds.

### C) AWS SES

AWS SES is the cheapest option at scale ($0.10/1,000 emails) but requires AWS account setup, IAM roles, sandbox approval, and production approval from AWS support. For a portfolio project this is significant operational overhead. Rejected on setup complexity.

### D) Nodemailer + SMTP (e.g., Gmail)

Using Nodemailer with a Gmail SMTP relay is zero cost but has significant drawbacks: Gmail rate limits, deliverability issues from residential IPs, OAuth complexity for "less secure app" access, and zero production credibility. Rejected because it signals "I didn't think about deliverability" in a portfolio context.

---

## Consequences

### Positive

- Zero cost at this project's email volume (< 100 emails/month in practice).
- Clean REST API with a first-party Node.js SDK (`resend` package). One import, one function call.
- Dev-stub fallback means `RESEND_API_KEY` is never a blocker during local dev or in CI.
- Domain verification records established now remain valid indefinitely; no ongoing maintenance required.

### Negative

- **Deliverability reputation:** Resend is a younger provider (founded 2022) and its aggregate sending reputation, while good, is not as deep as Postmark's which has been accumulating since 2010. For alerts that need to reach inbox reliably, this is an acknowledged trade-off.
- **Domain verification is a one-way door.** SPF/DKIM/DMARC records on the sending domain are provider-specific. Migrating to Postmark later means re-verifying DNS (up to 48-hour propagation delay), removing old records, and rebuilding sending reputation. Don't choose a provider casually — this decision sticks.
- **No retry infrastructure in the provider.** Resend does not automatically retry failed deliveries the way some providers do. `checkAlerts.js` implements its own retry logic via the `email_sent_at` / `email_error` columns in `alert_events` — a worker crash between insert and send results in a retry on the next scheduled audit run, not a silent drop.

### Neutral

- The `resend` npm package is an additional dependency. It is small (~30KB) and has no native-module bindings, so it doesn't affect Vercel's bundle size meaningfully.

---

## Open questions

- **Domain verification.** The sending domain must be verified in the Resend dashboard before emails deliver. This is a one-time manual step outside the codebase — whoever deploys must complete it.
- **From address.** The email `from` field should use the verified domain (e.g., `alerts@yourdomain.com`). Using `onboarding@resend.dev` (Resend's default test address) works during testing but delivers to spam in production. Configured via `RESEND_FROM_EMAIL` or hardcoded after domain is verified.
- **Upgrade path.** If this project grows to a team product needing SLA-grade deliverability, migrate to Postmark at that point. The migration cost (DNS reconfiguration, propagation wait, code change is 1 line) is worth paying when the volume and stakes justify it.

---

## References

- `api/lib/email.js` — the thin Resend wrapper
- `api/lib/checkAlerts.js` — caller; records `email_sent_at` / `email_error` in `alert_events`
- `docs/ROADMAP.md` — Phase 3: Notifications
- `migrations/<timestamp>_add-alerts-tables.{up,down}.sql` — `alert_events` table schema
