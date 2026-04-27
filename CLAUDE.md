# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (root)
```bash
npm run dev      # Start Vite dev server on port 5173
npm run build    # Build Vue app for production
npm run preview  # Preview production build
```

### Backend (standalone Express server)
```bash
cd backend && npm run dev    # Start with nodemon (development)
cd backend && npm run start  # Start Express server on port 3001
```

### Vercel serverless (API functions in /api)
```bash
vercel dev   # Runs Vite frontend + Vercel serverless functions together on port 3000
```

The Vite dev server proxies `/api/*` to `http://localhost:3000` (Vercel dev), so for full local development run `vercel dev` and `npm run dev` together.

## Architecture

This is a full-stack Lighthouse performance audit tool with two separate backend modes:

**`/api/` — Vercel serverless functions** (primary deployment target)
- `lighthouse.js` — main audit engine; handles SSE streaming and full audit logic
- `ai-summary.js` — OpenAI-powered audit summaries (uses `gpt-4.1`)
- `audit.js`, `health.js`, `status.js` — additional endpoints
- `/api/utils/` — shared helpers: `getLaunchConfig.js` (Puppeteer/Chrome setup), `getLighthouseConfig.js`, `findLocalChrome.js`

**`/backend/` — standalone Express server** (alternative local mode)
- `server.js` → `routes/lighthouse.js` → `services/lighthouseService.js`
- Mirrors the Vercel API surface; use when not deploying to Vercel

**Frontend — Vue 3 SPA (`/src/`)**
- `views/HomeView.vue` — main audit UI; orchestrates all form inputs and result display
- `composables/useLighthouseAudit.js` — core audit state machine; manages SSE streaming, run averaging, and progress tracking
- `utils/lighthouseApi.js` — SSE streaming client
- `components/ui/` — all display components (forms, metric cards, score cards, charts, AI summary)
- `components/layout/` — AppLayout, AppHeader, AppSidebar (dark mode via `provide/inject`)

**Real-time streaming**: Audit progress uses Server-Sent Events (SSE). The backend streams progress events; the frontend consumes them via `EventSource` in `lighthouseApi.js`.

**Multi-run averaging**: Users can run 1–10 audit iterations; the frontend averages numeric metrics across runs before display.

## Features

### Audit Configuration
- **Device**: Desktop or Mobile testing profiles
- **Network Throttling**: No throttling (more profiles planned)
- **Multiple Runs**: 1–10 consecutive runs for statistical reliability
- **Audit View**: Standard (key metrics) or Full (complete report with all audits)

### Results & Metrics
- **Four Lighthouse scores**: Performance, Accessibility, Best Practices, SEO — color-coded (green/yellow/red) with sparkline backgrounds
- **Core Web Vitals**: FCP, LCP, CLS, TBT, Speed Index, TTI, and more
- **Opportunities**: Optimization recommendations with time/byte savings estimates
- **Diagnostics**: Technical audit diagnostics
- **Multi-run comparison**: Per-run data table + bar chart of averaged metrics (shown when runs ≥ 2)
- **CSV export**: Download audit results as a CSV file

### Pages
- **Home** — main audit UI with real-time SSE progress bar and status messages
- **Compare Results** — drag-and-drop upload of `.txt`/`.csv`/`.json` audit files for side-by-side comparison with AI summary
- **Documentation** — explains Lighthouse scoring, the four performance pillars, and score categories

### AI Summary
- GPT-4.1 powered analysis of audit results with insights and recommendations
- Available on both Home (single audit) and Compare Results (multi-file comparison)

### UI/UX
- Dark mode toggle (header on desktop, sidebar on mobile)
- Responsive layout with collapsible sidebar; swipe-left gesture to close on mobile
- Sound effect (pop) on audit completion
- GSAP entrance/cascade animations on result cards

## Key environment variables

```
VITE_API_URL          # Frontend: base URL for API calls
OPENAI_API_KEY        # AI summary generation
HUGGING_FACE_TOKEN    # Alternative AI inference
```

See `.env.example` for all variables. The `.env` file (gitignored except currently tracked) holds actual values.

## Deployment

`vercel.json` configures Vercel builds: the static frontend (`dist/`) and all `api/*.js` serverless functions. Serverless functions get 60s timeout and 1024MB memory, with specific `node_modules` bundled (lighthouse, chromium, axe-core, etc.).
