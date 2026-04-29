# src/CLAUDE.md

Vue 3 SPA. Vite + Tailwind CSS 4 + PrimeVue 4.

## Vue conventions

- `<script setup>` syntax only — no Options API, no `defineComponent`
- Composition API only — no `this`
- Component files: PascalCase (`AuditResults.vue`)
- Composables/utils: camelCase (`useLighthouseAudit.js`, `animationUtils.js`)

## Global state

All shared state lives in `App.vue` as `ref` + `provide`. Current values provided:

```js
provide('isDarkMode', isDarkMode)           // ref<Boolean>
provide('toggleDarkMode', toggleDarkMode)   // () => void
provide('currentDevice', currentDevice)     // ref<'desktop'|'mobile'>
provide('currentThrottle', currentThrottle) // ref<'none'|...>
provide('currentRuns', currentRuns)         // ref<Number 1-10>
provide('currentAuditView', currentAuditView) // ref<'standard'|'full'>

// Auth state — set from localStorage on mount; updated by login/logout
provide('user', user)     // ref<{id, email}|null>
provide('token', token)   // ref<string|null>
provide('login', login)   // (token, user) => void — saves to localStorage + updates refs
provide('logout', logout) // () => void — clears localStorage, redirects to /auth
```

To consume: `const isDarkMode = inject('isDarkMode', ref(false))`

**Never create a Pinia store or Vuex module.** New shared state goes in `App.vue`.

### Auth state pattern

`login(token, user)` stores both to `localStorage` (`lh_token`, `lh_user`) and updates the refs. `logout()` clears localStorage and pushes to `/auth`. On `onMounted`, `App.vue` reads localStorage to restore session. Components that need to show/hide auth-gated UI inject `user` — if `user.value === null`, the visitor is a guest.

## Dark mode — two tracks

- **Components** (below views): `inject('isDarkMode')`
- **Layout components** (`AppLayout`, `AppHeader`, `AppSidebar`): also receive `isDarkMode` as a prop from `App.vue`, because they sit above the inject boundary

Don't mix the tracks. If a component is inside a view, use inject.

Tailwind dark mode classes:
```vue
:class="[isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200']"
```

PrimeVue dark mode is driven by the `.dark` class on `<html>` — toggled in `App.vue:handleThemeChange`. The `#app` div also gets `class="dark"` when active.

## PrimeVue vs Tailwind boundary

| Use PrimeVue for | Use Tailwind for |
|---|---|
| Interactive controls: `Button`, `SelectButton`, `Accordion`, `AccordionTab`, `Card`, `Tooltip` | All layout, spacing, color, typography |
| Form components: `Select`, `InputText` | Responsive breakpoints (`lg:`, `md:`) |
| | Hover/focus states on non-PrimeVue elements |

Do not use PrimeVue layout components (`Grid`, `Flex`). Do not use Tailwind for states PrimeVue manages internally.

## Routing

```
/              → HomeView.vue          (main audit UI)
/upload        → FileUploadView.vue    (Compare Results — note: UI calls it "Compare", route is /upload)
/documentation → DocumentationView.vue
/auth          → AuthView.vue          (login + signup — three-step: email → login or signup)
/history       → HistoryView.vue       (paginated audit history — authenticated users only)
```

`createWebHistory()` — HTML5 mode, no hash.

**Router guards** (`src/router/index.js`):
- `/auth` → redirects to `/` if `localStorage.lh_token` is set (already authenticated)
- `/history` → redirects to `/auth` if `localStorage.lh_token` is not set (guest)

## Stale files — do not import

- `src/primeVueOverrides.css` — duplicate; `src/themes/primeVueOverrides.css` is the canonical location (neither is currently imported)

## No tooling

No ESLint, Prettier, or Vitest. Don't scaffold them without instruction.

## New views

### `AuthView.vue`

Three-step login/signup flow:
1. **email step** — user enters email, `GET /api/auth/check-email` is called
2. **login step** — shown if email exists; calls `POST /api/auth/login`
3. **signup step** — shown if email is new; calls `POST /api/auth/signup`

On success, calls `inject('login')(token, user)` and pushes to `/`. Uses PrimeVue `InputText` + `Button`. Transitions between steps with slide animations.

### `HistoryView.vue`

Paginated table of past audits for the authenticated user. Calls `GET /api/history` via `useAuditHistory`. Displays: URL, device, runs count, date, four category score badges, and six CWV metric badges (FCP, LCP, SI, CLS, TBT, TTI) color-coded against Google's official thresholds. URL filter via `InputText`. PrimeVue `DataTable` + `Paginator` + `Skeleton` for loading state. Uses `inject('isDarkMode')`.

When a URL filter is active:
- **Schedule UI** — a "Schedule" button opens a modal to configure Daily/Weekly/Monthly cron audits via `POST /api/jobs`. Shows "Scheduled ✓" badge when active. Max 5 scheduled URLs per user enforced in both the API and the UI.
- **Trend chart** — line chart (Chart.js) of Performance, FCP, LCP, CLS, TBT over time; shown when ≥2 runs exist. `regressionMap` computed property compares the most recent run against the average of previous runs and renders an exclamation-triangle icon on regressed metric badges (score metrics ≥10 point drop, time metrics ≥20% increase, CLS ≥0.1 increase).
- **Alert thresholds** — inline panel via `useAlertConfigs`; shown when user is logged in and at least one run exists for the URL (provides `target_id`). Per-metric rows with comparison dropdown, threshold input, enabled toggle, save/delete. Inline notice when no schedule is active: "Alerts only fire for scheduled audits."

## New composables

### `useAuditHistory.js`

Fetches paginated audit history from `GET /api/history`. Reads token from `localStorage`. Used exclusively in `HistoryView.vue`.

Returns: `{ runs, total, page, limit, loading, error, fetchHistory }`

`fetchHistory({ page, limit, url })` — `url` is an optional exact-match filter.

### `useAuditNotification.js`

Shows an "Audit complete ✓" badge when a Lighthouse audit finishes. Encapsulates the Page Visibility API logic: the 2-second auto-dismiss timer only runs while the tab is visible; it pauses if the tab is hidden and resumes when the tab becomes visible again.

Used inside `useLighthouseAudit.js` — `showNotification()` is called in the `complete` SSE event handler. Returns `{ visible, show, dismiss }` which are re-exported from `useLighthouseAudit`.

Badge rendered in `HomeView.vue` via `<Teleport to="body">`. The `dismiss()` function removes the `visibilitychange` listener and clears the timer.

### `useAlertConfigs.js`

CRUD composable for alert threshold configs. Calls `GET/POST /api/alerts` and `PATCH/DELETE /api/alerts/:id`. Used exclusively in `HistoryView.vue`.

Returns: `{ configs, loading, error, fetchAlerts, createAlert, updateAlert, deleteAlert }`

`fetchAlerts(targetId)` — pass a UUID target ID to scope results to one URL; omit for all user configs. Clears `configs` and returns early if `targetId` is falsy.

### `useSound.js`

Plays the "audit complete" pop sound via the Web Audio API. Used in `HomeView.vue` — `playOn()` is called when `progress` hits 100. No external audio file dependency; the sound is generated programmatically.

## Sub-directory docs

- Component layer rules, animation patterns, score thresholds → `src/components/CLAUDE.md`
- Audit state machine, SSE→ref mapping, composable patterns → `src/composables/CLAUDE.md`
