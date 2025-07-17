<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card
      v-for="metric in metrics"
      :key="metric.key"
      class="text-center"
    >
      <template #content>
        <div :class="[
          'text-2xl font-bold mb-2',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]">{{ scores[metric.key] || '--' }}</div>
        <div :class="[
          'text-sm font-medium',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">{{ metric.label }}</div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import Card from 'primevue/card'

const metrics = [
  { key: 'performance', label: 'Performance' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'bestPractices', label: 'Best Practices' },
  { key: 'seo', label: 'SEO' }
]

defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  },
  scores: {
    type: Object,
    default: () => ({
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null
    })
  }
})
</script>
