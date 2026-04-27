# ADR 0001: Dual-mode deployment — Vercel serverless functions and standalone Express server

**Status:** Accepted
**Date:** 2026-04-26
**Deciders:** Jainil Chauhan

---

## Context

Lighthouse + Puppeteer is not a typical API workload. Each audit request launches a real headless Chrome browser, loads a target URL, runs a multi-second CPU-bound analysis, and then tears Chrome down. There is no way to make this fast, lightweight, or stateless in the way a JSON CRUD endpoint is. A runtime environment that handles it must be able to:

1. **Bundle or locate a Chrome binary.** A standard Chrome installation is ~300MB. Serverless function bundles have tight size constraints and no persistent filesystem. This is the central constraint the architecture has to solve.
2. **Tolerate 5–60 second execution times.** Lighthouse takes 5–20 seconds per run on a typical site. A 5-run audit on a slow site can exceed 60 seconds. Any deployment target with a hard timeout shorter than that is fragile.
3. **Support long-lived HTTP responses.** Results are streamed over SSE as they arrive. The deployment target must allow an HTTP response to stay open for 10–60 seconds while the server writes to it incrementally.
4. **Work during local development without a multi-second cold start per iteration.** Vercel serverless functions have cold starts of 3–5 seconds. Running `vercel dev` locally replicates this partially, but it's still heavier than a persistent local process.

There's also a deployment-choice question: the project is a portfolio piece that needs to be easily demoed. Zero-config cloud hosting (Vercel) is the right default. But locking the entire backend into Vercel's runtime constraints — especially for future features like BullMQ scheduled jobs — would create an expensive migration later.

These forces don't all point at the same solution, which is why a decision was needed.

---

## Decision

Maintain two backend modes in parallel:

- **`/api/`** — Vercel serverless functions (primary production deployment). Each file in `api/` is an isolated function deployed by Vercel. Chrome is provided by `@sparticuz/chromium`, a stripped ~80MB Chromium build designed for Lambda-style environments. `vercel.json` explicitly includes it in the function bundle via `includeFiles` alongside Lighthouse and its peer dependencies (`axe-core`, `speedline-core`, etc.) — without this config, the function deploys without Chrome and fails silently on every request.

- **`/backend/`** — standalone Express server on port 3001 (alternative deployment for Railway/Render/VPS, and local dev without Vercel CLI). Uses `chrome-launcher` to find and launch the host system's Chrome installation. No timeout. Runs as a persistent process, which makes it the right home for future BullMQ workers.

- **Parity contract**: both backends emit the same SSE event schema (`start`, `progress`, `run-complete`, `complete`, `error`) with identical field names and shapes. The frontend (`src/utils/lighthouseApi.js`) switches backends by changing the Vite proxy target — it has no knowledge of which backend it's talking to.

- **Shared logic** — Lighthouse config and local Chrome path resolution live in `api/utils/` (`getLaunchConfig.js`, `getLighthouseConfig.js`, `findLocalChrome.js`). The backend does not import these; it inlines its own equivalents. This is a known gap, not intentional design.

- **Local dev**: `vercel dev` runs on port 3000; Vite proxies `/api/*` → `http://localhost:3000`. For heavy iteration that doesn't need serverless fidelity, switch the proxy to `http://localhost:3001` and run `cd backend && npm run dev`.

---

## Alternatives considered

### A) Vercel serverless only

Deploy only `/api/`. Delete `/backend/`. One codebase, one deployment model.

Rejected because:
- The 60-second timeout is already fragile for multi-run audits. A 5-run audit on a slow URL (20s/run) hits it exactly; any network variance tips it over. There's no way to increase this limit on the Vercel hobby tier.
- BullMQ scheduled jobs (planned — see [ROADMAP Phase 2](../ROADMAP.md)) require a persistent Redis-connected worker process that runs indefinitely. Vercel serverless functions terminate the moment `res.end()` is called. There is no way to make this work without a separate always-on service anyway.
- Deployers who don't use Vercel have no path forward.

### B) Express only

Deploy only `/backend/`. Skip Vercel entirely.

Rejected because:
- Kills the "deploy in 30 seconds to show an interviewer" story. Vercel's zero-config deployment is genuinely valuable for a portfolio project.
- Requires managing a persistent server (uptime, restarts, HTTPS termination). That operational overhead is unnecessary overhead for a v1.
- Likely would have been revisited anyway once BullMQ work starts.

### C) AWS Lambda + API Gateway

Use AWS Lambda for the serverless path instead of Vercel.

Not seriously considered. AWS Lambda solves the same Chrome-in-serverless problem (via the same `@sparticuz/chromium` package) but adds significant ops overhead: IAM roles, API Gateway configuration, CloudWatch, deployment pipelines. Vercel does all of that for free with a `git push`. The marginal gain over Vercel doesn't justify it for a portfolio project.

### D) Long-running container on Fly.io or Railway

Single deployment: a persistent container running the Express server. No serverless at all.

Closest to the right answer for a production system. Eliminates the 60-second timeout entirely, makes BullMQ trivial, and avoids the dual-maintenance burden.

Rejected for v1 because:
- Even the free tiers of Fly.io/Railway require configuring a `Dockerfile` or build config, health checks, and a custom domain — more setup than Vercel's static + function deploy.
- Cold starts become "the container is sleeping and needs to wake up," which isn't obviously better for demo purposes.
- Doesn't change anything in v1. BullMQ isn't shipped yet. When it is, this option becomes the likely migration target — see Open Questions.

---

## Consequences

### Positive

- Vercel deployment is trivial and free. Push to `main`, get a URL. The demo link in a portfolio always works.
- The Express path exists as an escape hatch before it's urgently needed. When Vercel's constraints become blocking (BullMQ, timeout increases), there's no emergency migration — just change the proxy and point DNS elsewhere.
- Local development works without Vercel CLI. `cd backend && npm run dev` gives a full-featured local backend with no cold starts and faster iteration.

### Negative

- **Code duplication is real and currently not fully mitigated.** `calculateAverages()` is duplicated verbatim in both `api/lighthouse.js` and `backend/services/lighthouseService.js`. The `api/utils/` shared modules (`getLighthouseConfig.js`, `getLaunchConfig.js`) are imported by `/api/` but not by `/backend/` — the backend inlines its own equivalents. A bug fix or behavior change in one requires a manual update to the other. The parity rule in `backend/CLAUDE.md` is documentation, not enforcement.
- **Parity drift has already started.** `api/lighthouse.js` has fake progress simulation (`setInterval`, +5–10% every 2s) and monotonic progress enforcement (`globalProgress`). `backend/services/lighthouseService.js` has neither — it sends progress only at run-start and run-complete, with silence in between. The Express backend also has a 3-second Chrome stabilization delay that the serverless function doesn't. These divergences are invisible unless you test both modes.
- **Two test surfaces.** A bug can exist in one mode and not the other. There are currently no automated tests in either path.

### Neutral

- Forces a clean separation of transport (SSE headers, `res.write`) from audit logic (Lighthouse invocation, result shaping). This is good architecture, but it was a side effect of the dual-path constraint, not a goal.

---

## Open questions / future revisits

- **BullMQ inflection point.** When scheduled jobs ship, a persistent worker process is required. Vercel serverless cannot host it. At that point: does the Express backend become the primary deployment, with Vercel reduced to serving the static frontend + on-demand audit API? Or is a split architecture more appropriate (Vercel for on-demand, Railway/Render for the worker)? This decision should be made before BullMQ work begins, not during it. See [ROADMAP Phase 2](../ROADMAP.md).

- **Shared utils expansion.** The `api/utils/` modules (`getLighthouseConfig.js`, `getLaunchConfig.js`) could be extracted to a shared top-level `lib/` or `shared/` directory and imported by both backends. This would close the parity gap for config logic. Not done in v1 because the path resolution differs between environments, but it's viable.

- **If Vercel raises its limits.** Vercel has raised serverless limits before (60s was itself an increase from 10s). If the timeout increases significantly, some of the Express backend's advantages shrink. Doesn't change the BullMQ argument.

---

## References

- `vercel.json` — `includeFiles`, `maxDuration: 60`, `memory: 1024`
- `api/lighthouse.js` — serverless handler, `prepareBrowser()`, `calculateAverages()`
- `api/utils/getLaunchConfig.js` — `@sparticuz/chromium` vs local Chrome path resolution
- `api/utils/getLighthouseConfig.js` — shared Lighthouse config (imported by `/api/` only)
- `backend/server.js` — Express setup, port 3001
- `backend/services/lighthouseService.js` — `chrome-launcher`, `runLighthouseAuditStream()`, `calculateAverages()` (duplicated)
- `docs/architecture.md` Section 4 — "Why two backends?"
- `docs/ROADMAP.md` — BullMQ scheduled jobs (Phase 2)
