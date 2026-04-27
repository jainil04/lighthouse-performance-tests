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
