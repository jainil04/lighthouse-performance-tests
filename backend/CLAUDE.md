# backend/CLAUDE.md

Standalone Express server — alternative deployment target when Vercel is not used (Railway, Render, self-hosted VPS). Has its own `package.json` and `node_modules`.

**Not the active backend in default local dev.** The Vite proxy points to port 3000 (Vercel dev). To use this instead, change `vite.config.js` proxy target to `http://localhost:3001`.

## Chrome strategy

Uses `chrome-launcher` to find and launch the **local system Chrome** installation. This is the opposite of `/api/` which uses `puppeteer-core` + `@sparticuz/chromium`.

- Do not add `puppeteer-core` or `@sparticuz/chromium` here
- Do not add `chrome-launcher` to `/api/`

## Middleware stack (order matters)

```
helmet → compression → cors → express.json({ limit: '10mb' }) → requireAuth → routes
```

CORS origin: `process.env.FRONTEND_URL || 'http://localhost:5173'`.

**Auth:** `server.js` defines a `requireAuth` Express middleware that calls `verifyToken(req)` from `../api/lib/auth.js` (the same JWT verifier used by the Vercel functions). It is applied to `/api/lighthouse` — the route is auth-required, not open. A missing or invalid `Authorization: Bearer <token>` header returns `401`.

## Route structure

```
server.js (port 3001)
  ├── requireAuth (middleware, applied to /api/lighthouse)
  └── /api/lighthouse  →  routes/lighthouse.js
        ├── POST /audit/stream  →  services/lighthouseService.runLighthouseAuditStream
        │     (also runs request validation via middleware/validation.js)
        ├── POST /audit         →  services/lighthouseService.runLighthouseAudit
        │     (also runs request validation via middleware/validation.js)
        └── GET  /status

GET /health  (at root, not under /api/lighthouse)
```

## Parity rule

Any audit logic change in `api/lighthouse.js` **must** be mirrored in `services/lighthouseService.js`. The SSE event schema (types, field names, progress behaviour) must remain identical. The frontend switches backends by changing the proxy — if they diverge, the frontend breaks silently.

## Running

```bash
cd backend && npm run dev    # nodemon watch, port 3001
cd backend && npm run start  # production, port 3001
```

Port: `process.env.PORT || 3001`.

## When this becomes primary

If you deploy to a non-Vercel host:
1. Change `vite.config.js` proxy target from `http://localhost:3000` to `http://localhost:3001`
2. Set `FRONTEND_URL` in backend `.env` to the production frontend URL
3. The `/api/lighthouse` path the frontend calls maps to `POST /api/lighthouse/audit/stream` here — verify the route exists
4. Auth is already enforced via `requireAuth`. The frontend must send `Authorization: Bearer <token>` — `lighthouseApi.js` already does this when `lh_token` is in `localStorage`. Guest users (no token) will receive `401` from this backend.
