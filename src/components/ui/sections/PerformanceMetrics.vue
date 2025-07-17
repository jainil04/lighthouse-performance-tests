<template>
  <div :class="[
    'rounded-lg shadow-sm border p-6',
    isDarkMode
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200'
  ]">
    <h2 :class="[
      'text-xl font-semibold mb-3',
      isDarkMode ? 'text-white' : 'text-gray-900'
    ]">Performance Metrics</h2>
    <p :class="[
      'mb-4',
      isDarkMode ? 'text-gray-300' : 'text-gray-600'
    ]">Your performance testing results will appear here.</p>

    <!-- Score Cards -->
    <ScoreCards
      :is-dark-mode="isDarkMode"
      :scores="scores"
    />
  </div>
</template>

<script setup>
import ScoreCards from '../common/ScoreCards.vue'

defineProps({
  scores: Object,
  isDarkMode: Boolean
})
</script>
