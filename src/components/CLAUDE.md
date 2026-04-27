# src/components/CLAUDE.md

## Layer rules

### `layout/`
Shell components: `AppLayout`, `AppHeader`, `AppSidebar`, `ThemeToggler`.
- Receive config state as props **and** use `inject` for `isDarkMode`
- Emit user config changes up to `App.vue`: `@theme-change`, `@device-change`, `@throttle-change`, `@runs-change`, `@audit-view-change`
- No audit business logic; no composable imports

### `ui/sections/`
Page-level composed sections: `WelcomeSection`, `PerformanceMetrics`, `AuditResults`.
- Receive audit data as props from their parent view
- Use `inject('isDarkMode')` for dark mode
- Compose multiple `common/` components; handle section-level GSAP animations

### `ui/common/`
Pure display: metric cards, charts, tables, progress bar, AI summary, full report view.
- **Props only** — never `inject`, never import composables
- Must render correctly given only correct props; no side effects

### `ui/forms/`
Sidebar input controls: selectors, URL input, file upload.
- Emit one named event per interaction
- May keep internal UI state (e.g. `selectedValue` synced via `watch` on prop)
- Never manage audit state

## Animation rules

Use `src/utils/animationUtils.js`. Do not write raw `gsap.*` calls in components.

```js
import {
  animateSlideDownEntry,  // container entry (slide down + bounce)
  animateSlideUpExit,     // container exit (slide up + fade)
  animateCascade,         // staggered cascade of multiple elements
  animateIconEntry,       // icon scale + rotation bounce-in
  animateSpinner          // continuous rotation (e.g. loading spinner)
} from '../../utils/animationUtils'
```

Standard pattern for section/common components that animate on data arrival:

```vue
<div ref="container">...</div>

<script setup>
const container = ref(null)

watch(() => hasData.value, (hasData, hadData) => {
  if (hasData && !hadData) {
    shouldShow.value = true
    nextTick(() => {
      animateSlideDownEntry(container.value)
    })
  } else if (!hasData && hadData) {
    animateSlideUpExit(container.value, { onComplete: () => shouldShow.value = false })
  }
})
</script>
```

Always guard: `if (!element) return` before any GSAP call.

## Score color thresholds — apply consistently everywhere

```
score >= 90  →  green   text-green-500  /  bg-green-100 text-green-800
score >= 50  →  yellow  text-yellow-500 /  bg-yellow-100 text-yellow-800
score <  50  →  red     text-red-500    /  bg-red-100 text-red-800
```

Dark mode badge swap: `bg-*-100` → `bg-*-900`, `text-*-800` → `text-*-200`.

Example:
```js
const badgeClass = (score) => {
  if (score >= 90) return isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
  if (score >= 50) return isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
  return isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
}
```

## Props naming convention

```vue
<!-- Template: kebab-case -->
<MyComponent :is-dark-mode="isDarkMode" :audit-results="auditResults" />

<!-- defineProps: camelCase -->
defineProps({ isDarkMode: Boolean, auditResults: Object })
```

## Adding a new component

1. Decide the layer (layout / section / common / form) — this determines inject vs prop, animation vs none
2. Place in the correct subdirectory
3. For `common/`: no inject, no composable imports — props only
4. For `sections/`: inject `isDarkMode`, receive data as props, GSAP animate on `hasData` change
