# ADR 004 — provide/inject instead of Pinia

## Status
Accepted

## Context
The app has shared UI state (dark mode, device, throttle, runs, audit view) that needs to flow from the sidebar controls down to the audit logic and display components.

## Decision
Use Vue 3's built-in `provide`/`inject` with `ref` values in `App.vue`. No Pinia, no Vuex.

## Rationale
- The shared state is shallow (6 values) and has a single owner (`App.vue`)
- `provide`/`inject` is sufficient for this tree depth and eliminates a dependency
- Pinia adds value when multiple unrelated components need to mutate the same state independently — that pattern doesn't exist here yet

## Consequences
- **Positive**: No store boilerplate; Vue devtools still shows injected values; easy to reason about ownership
- **Negative**: Inject is implicit — a component that uses `inject('currentDevice')` has a hidden dependency on `App.vue`'s provide call. New developers may not find the source easily.
- **Watch**: When user history is added (Postgres + auth), the audit results will need to persist across routes. At that point, a `useAuditHistory` composable backed by API calls is the right pattern — still no global store needed. If three or more views need to share mutable state simultaneously, revisit Pinia.
