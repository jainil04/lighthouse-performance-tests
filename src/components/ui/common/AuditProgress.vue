<template>
  <div
    v-if="isRunning || auditError || (progress > 0 && !isRunning)"
    :class="[
      'rounded-lg shadow-sm border p-6',
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    ]"
  >
    <!-- Error State -->
    <div v-if="auditError" class="text-center">
      <div class="mb-4">
        <i class="pi pi-exclamation-triangle text-4xl text-red-500"></i>
      </div>
      <h3 :class="[
        'text-lg font-medium mb-2 text-red-600'
      ]">Audit Failed</h3>
      <p :class="[
        'text-sm',
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      ]">{{ auditError }}</p>
    </div>

    <!-- Running State -->
    <div v-else-if="isRunning">
      <div class="flex items-center justify-between mb-4">
        <h3 :class="[
          'text-lg font-medium',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]">Running Lighthouse Audit</h3>
        <span :class="[
          'text-sm font-medium',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">{{ progress }}%</span>
      </div>

      <!-- Progress Bar -->
      <ProgressBar
        :value="progress"
        :class="[
          'mb-4',
          isDarkMode ? 'p-progressbar-dark' : ''
        ]"
      />

      <!-- Current Status -->
      <div class="flex items-center space-x-2">
        <i class="pi pi-spin pi-spinner text-blue-600"></i>
        <span :class="[
          'text-sm',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">{{ currentMessage || 'Preparing audit...' }}</span>
      </div>

      <!-- Stage Indicator -->
      <div v-if="currentStage" class="mt-2">
        <span :class="[
          'inline-block px-2 py-1 text-xs rounded-full',
          isDarkMode
            ? 'bg-blue-900 text-blue-200'
            : 'bg-blue-100 text-blue-800'
        ]">{{ currentStage }}</span>
      </div>
    </div>

    <!-- Completed State -->
    <div v-else-if="progress >= 100">
      <div class="flex items-center justify-between mb-4">
        <h3 :class="[
          'text-lg font-medium',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]">Audit Completed</h3>
        <span :class="[
          'text-sm font-medium text-green-600'
        ]">{{ progress }}%</span>
      </div>

      <!-- Completed Progress Bar -->
      <ProgressBar
        :value="progress"
        :class="[
          'mb-4',
          isDarkMode ? 'p-progressbar-dark' : ''
        ]"
      />

      <!-- Success Status -->
      <div class="flex items-center space-x-2">
        <i class="pi pi-check-circle text-green-600"></i>
        <span :class="[
          'text-sm',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">Lighthouse audit completed successfully!</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import ProgressBar from 'primevue/progressbar'

defineProps({
  isRunning: Boolean,
  auditError: String,
  progress: Number,
  currentMessage: String,
  currentStage: String,
  isDarkMode: Boolean
})
</script>
