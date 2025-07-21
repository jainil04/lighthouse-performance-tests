<template>
  <div :class="[
    'rounded-lg shadow-sm border p-6',
    isDarkMode
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200'
  ]">
    <h1 :class="[
      'text-2xl font-semibold mb-4',
      isDarkMode ? 'text-white' : 'text-gray-900'
    ]">Welcome to Lighthouse Performance Tests</h1>
    <p :class="[
      'mb-4',
      isDarkMode ? 'text-gray-300' : 'text-gray-600'
    ]">This is your dashboard for running and analyzing performance tests.</p>

    <!-- URL Input -->
    <div class="mt-6">
      <UrlInput
        :model-value="url"
        :is-dark-mode="isDarkMode"
        :loading="isRunning"
        :disabled="isRunning"
        label="Website URL"
        placeholder="Enter URL to test (e.g., https://example.com)"
        @url-change="handleUrlChange"
        @submit="handleSubmit"
      />
    </div>
    <Hello :is-dark-mode="isDarkMode"/>

    <!-- Selection Summary -->
    <div class="mt-4">
      <SelectionSummary
        :device="currentDevice"
        :throttle="currentThrottle"
        :runs="currentRuns"
        :is-dark-mode="isDarkMode"
      />
    </div>
  </div>
</template>

<script setup>
import UrlInput from '../forms/UrlInput.vue'
import SelectionSummary from '../common/SelectionSummary.vue'
import Hello from '../../Hello.vue'

defineProps({
  url: String,
  isDarkMode: Boolean,
  isRunning: Boolean,
  currentDevice: String,
  currentThrottle: String,
  currentRuns: Number
})

const emit = defineEmits(['url-change', 'submit'])

const handleUrlChange = (url) => {
  emit('url-change', url)
}

const handleSubmit = (url) => {
  emit('submit', url)
}
</script>
