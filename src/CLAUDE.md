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
provide('isDarkMode', isDarkMode)       // ref<Boolean>
provide('toggleDarkMode', toggleDarkMode) // () => void
provide('currentDevice', currentDevice)   // ref<'desktop'|'mobile'>
provide('currentThrottle', currentThrottle) // ref<'none'|...>
provide('currentRuns', currentRuns)     // ref<Number 1-10>
provide('currentAuditView', currentAuditView) // ref<'standard'|'full'>
```

To consume: `const isDarkMode = inject('isDarkMode', ref(false))`

**Never create a Pinia store or Vuex module.** New shared state goes in `App.vue`.

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
```

`createWebHistory()` — HTML5 mode, no hash.

## Stale files — do not import

- `src/primeVueOverrides.css` — duplicate; `src/themes/primeVueOverrides.css` is the canonical location (neither is currently imported)

## No tooling

No ESLint, Prettier, or Vitest. Don't scaffold them without instruction.

## Sub-directory docs

- Component layer rules, animation patterns, score thresholds → `src/components/CLAUDE.md`
- Audit state machine, SSE→ref mapping, composable patterns → `src/composables/CLAUDE.md`
