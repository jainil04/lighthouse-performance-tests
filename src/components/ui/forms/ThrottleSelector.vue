<script setup>
import Select from 'primevue/select'
import { ref } from 'vue'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const throttleOptions = ref([
  { label: "No Throttling", value: "none" },
  // { label: "Fast 3G", value: "fast" },
  // { label: "Slow 3G", value: "slow" },
  // { label: "4G", value: "4g" },
  // { label: "3G", value: "3g" }
])

const selectedThrottle = ref('none')

const emit = defineEmits(['throttle-change'])

const handleThrottleChange = (value) => {
  emit('throttle-change', value)
}
</script>

<template>
  <div class="w-full">
    <label :class="['block text-sm font-medium mb-2', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
      Network Throttling
    </label>
    <Select
      v-model="selectedThrottle"
      v-tooltip.top="{ value: 'More options are coming soon', showDelay: 300, hideDelay: 300 }"
      :options="throttleOptions"
      optionLabel="label"
      placeholder="No Throttling"
      checkmark
      :highlightOnSelect="false"
      :class="[
        'w-full',
        isDarkMode ? 'p-component-dark' : 'p-component-light'
      ]"
      @change="handleThrottleChange($event.value)"
    />
  </div>
</template>
