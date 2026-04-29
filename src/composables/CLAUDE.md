# src/composables/CLAUDE.md

## useLighthouseAudit.js — audit state machine

The only stateful composable. Owns all audit-related refs. Used exclusively in `HomeView.vue`. Do not use it in more than one view — it is not designed for shared instances.

### Refs and what populates them

| Ref | Type | Populated by |
|-----|------|--------------|
| `isRunning` | `Boolean` | `runAudit()` sets true at start, false in `finally` |
| `progress` | `Number` 0–100 | Every SSE event (monotonically increasing) |
| `currentMessage` | `String` | Every SSE event |
| `currentStage` | `String` | Every SSE event |
| `auditError` | `String\|null` | `error` event |
| `scores` | `Object` | `run-complete` (latest run) → overwritten by `complete` |
| `detailedMetrics` | `Object` | `run-complete` (latest run) → overwritten by `complete` |
| `opportunities` | `Object` | `run-complete` (latest run) → overwritten by `complete` |
| `diagnostics` | `Object` | `run-complete` (latest run) → overwritten by `complete` |
| `allRunsData` | `Array` | **Appended** on each `run-complete` (one row per run) |
| `auditResults` | `Object\|null` | `complete` only — full data payload |
| `fullReport` | `Object\|null` | `complete` only, only when `auditView === 'full'` |

### SSE event → ref update detail

**`run-complete`**: overwrites `scores`/`detailedMetrics`/`opportunities`/`diagnostics` with latest run data; appends one row to `allRunsData`:
```js
{ run: N, fcp, lcp, tti, cls, si, tbt, srt }  // all numeric ms values
```

**`complete` — single run**: reads from `data.data.run.*`

**`complete` — multi-run**: reads aggregates from `data.data.averages.*`; reads `fullReport` from `data.data.runs[0].fullReport`

`fullReport` is `null` in standard view — always guard:
```js
if (fullReport.value) { ... }
```

### Progress rule — monotonic increase only

```js
if (newProgress > progress.value) progress.value = newProgress
```

**Never** set `progress.value` to a lower number anywhere in the codebase.

### audit-start DOM event

`runAudit()` dispatches:
```js
window.dispatchEvent(new CustomEvent('audit-start'))
```

`AppSidebar` listens to this to auto-close on mobile. Any new audit trigger must also dispatch this event.

### Reset on new audit

Every ref is reset at the start of `runAudit()`. If you add a new ref, add it to the reset block.

## useAlertConfigs.js — alert threshold CRUD

CRUD composable for `alert_configs`. Hits `GET/POST /api/alerts` and `PATCH/DELETE /api/alerts/:id`. Used exclusively in `HistoryView.vue`.

### API

| Export | Signature | Notes |
|--------|-----------|-------|
| `configs` | `ref([])` | Array of alert config objects; updated by every mutation |
| `loading` | `ref(false)` | Set during `fetchAlerts` only |
| `error` | `ref(null)` | Set on fetch failure; cleared on next fetch |
| `fetchAlerts(targetId)` | `(uuid) → void` | Fetches configs for a specific target. Returns early and clears `configs` if `targetId` is falsy. |
| `createAlert(fields)` | `({target_id, metric, threshold, comparison}) → config` | Prepends the returned config to `configs`. Throws on API error (including 409 duplicate). |
| `updateAlert(id, patch)` | `(uuid, {threshold?, comparison?, enabled?}) → config` | Updates the matching entry in `configs` in-place. |
| `deleteAlert(id)` | `(uuid) → void` | Removes the entry from `configs`. |

All functions read `lh_token` from `localStorage` on each call — no need to pass the token explicitly.

## New composable pattern

```js
export function use<Feature>() {
  const state = ref(initialValue)

  const doSomething = () => { ... }

  return { state, doSomething }
}
```

Rules:
- Single concern per file
- Return plain refs + functions — no `provide`/`inject` inside a composable
- No side effects at module level (only inside returned functions)
- Name: `use<Feature>.js`
