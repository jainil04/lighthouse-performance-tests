# ADR 0002 — SSE over WebSockets for audit streaming

## Status
Accepted

## Context
Lighthouse audits take 5–45 seconds. The UI needs real-time progress updates during that window. Options considered: polling, WebSockets, Server-Sent Events.

## Decision
Use Server-Sent Events (SSE) — a single long-lived HTTP response with `Content-Type: text/event-stream`.

Implementation note: the frontend uses `fetch()` + `ReadableStream` reader rather than the browser `EventSource` API, because `EventSource` only supports GET requests and the audit requires a POST body with config.

## Rationale
- **vs polling**: SSE eliminates the latency spikes and wasted requests of polling; progress feels immediate
- **vs WebSockets**: WebSockets are bidirectional — unnecessary here since the audit is fire-and-forget. SSE works over standard HTTP, fits naturally in Vercel serverless (no persistent connection upgrade needed), and is simpler to implement and debug
- **Vercel compatibility**: Vercel supports streaming responses. WebSocket upgrades on serverless functions are not straightforward.

## Consequences
- **Positive**: Simple server-side implementation (`res.write()` + `res.end()`); works through standard HTTP proxies
- **Negative**: Unidirectional only — if the user needs to cancel an in-progress audit, a separate cancellation mechanism would be needed (currently not implemented)
- **Watch**: If scheduled jobs (BullMQ) need to push progress to the frontend, they will reuse this same SSE pattern. A job ID will need to be returned at job creation, then a `GET /api/jobs/:id/stream` SSE endpoint added.
