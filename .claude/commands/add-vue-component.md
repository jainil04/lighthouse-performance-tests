Scaffold a new Vue 3 component following the established conventions for its layer.

## Steps

**1. Identify the layer**

Ask if not clear from context:
- `layout/` — shell (AppHeader, AppSidebar pattern); receives props + inject
- `ui/sections/` — page section (AuditResults pattern); inject dark mode, receive data as props, animate on data arrival
- `ui/common/` — pure display (MetricCard, OpportunityCard pattern); props only, no inject
- `ui/forms/` — sidebar control (DeviceSelector pattern); emit one event per interaction

**2. Place the file**

```
src/components/layout/<Name>.vue
src/components/ui/sections/<Name>.vue
src/components/ui/common/<Name>.vue
src/components/ui/forms/<Name>.vue
```

**3. Skeleton by layer**

### common/ (most frequent)
```vue
<template>
  <div :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200', 'rounded-lg border']">
    <!-- content -->
  </div>
</template>

<script setup>
defineProps({
  isDarkMode: { type: Boolean, default: false }
  // add data props
})
</script>
```

### forms/
```vue
<template>
  <!-- PrimeVue control -->
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  isDarkMode: { type: Boolean, default: false }
})
const emit = defineEmits(['<feature>-change'])
</script>
```

### sections/ (with animation)
```vue
<template>
  <div ref="container" v-if="shouldShow" :class="[...]">
    <!-- content -->
  </div>
</template>

<script setup>
import { ref, watch, inject, nextTick } from 'vue'
import { animateSlideDownEntry, animateSlideUpExit } from '../../../utils/animationUtils'

const isDarkMode = inject('isDarkMode', ref(false))
const props = defineProps({ /* data props */ })

const container = ref(null)
const shouldShow = ref(false)

const hasData = computed(() => /* check props */)

watch(hasData, (has, had) => {
  if (has && !had) {
    shouldShow.value = true
    nextTick(() => animateSlideDownEntry(container.value))
  } else if (!has && had) {
    animateSlideUpExit(container.value, { onComplete: () => shouldShow.value = false })
  }
})
</script>
```

**4. Score colors (if displaying scores)**
```js
const scoreClass = (score) => {
  if (score >= 90) return isDarkMode.value ? 'text-green-400' : 'text-green-600'
  if (score >= 50) return isDarkMode.value ? 'text-yellow-400' : 'text-yellow-600'
  return isDarkMode.value ? 'text-red-400' : 'text-red-600'
}
```

**5. Checklist**
- [ ] `<script setup>` syntax (no Options API)
- [ ] `common/`: no inject, no composable imports
- [ ] `sections/`: inject isDarkMode, animate on data arrival
- [ ] Props use camelCase in `defineProps`, kebab-case in parent template
- [ ] Dark mode class applied to root element
