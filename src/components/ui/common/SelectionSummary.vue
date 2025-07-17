<script setup>
import Chip from 'primevue/chip'

const props = defineProps({
  device: {
    type: String,
    default: 'desktop'
  },
  throttle: {
    type: String,
    default: 'none'
  },
  runs: {
    type: Number,
    default: 1
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const getThrottleLabel = (value) => {
  // Handle both object and string values
  const throttleValue = typeof value === 'object' && value !== null ? value.value : value

  const throttleMap = {
    none: 'No Throttling',
    fast3g: 'Fast 3G',
    slow3g: 'Slow 3G',
    lte: 'LTE'
  }
  return throttleMap[throttleValue] || throttleValue
}

const getDeviceLabel = (value) => {
  return value === 'desktop' ? 'Desktop' : 'Mobile'
}
</script>

<template>
  <div>
    <div class="mb-3">
      <label :class="[
        'text-sm font-medium block',
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      ]">
        Test Configuration
      </label>
    </div>
    <div class="flex items-center gap-3 flex-wrap">
      <Chip
        :icon="device === 'desktop' ? 'pi pi-desktop' : 'pi pi-mobile'"
        :label="getDeviceLabel(device)"
        :class="[
          'text-sm',
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />

      <Chip
        icon="pi pi-wifi"
        :label="getThrottleLabel(throttle)"
        :class="[
          'text-sm',
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />

      <Chip
        icon="pi pi-replay"
        :label="`${runs} Run${runs !== 1 ? 's' : ''}`"
        :class="[
          'text-sm',
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />
    </div>
  </div>
</template>
