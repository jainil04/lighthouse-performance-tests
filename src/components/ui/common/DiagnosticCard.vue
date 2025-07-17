<template>
  <Card :class="[
    'transition-all duration-200',
    isDarkMode
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200'
  ]">
    <template #content>
      <div class="p-3">
        <div class="flex items-start justify-between">
          <div class="flex-1 mr-4">
            <h4 :class="[
              'text-sm font-medium mb-1',
              isDarkMode ? 'text-white' : 'text-gray-900'
            ]">{{ title }}</h4>
            <p :class="[
              'text-xs leading-relaxed',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            ]">{{ description }}</p>
          </div>
          <div class="text-right">
            <div v-if="displayValue" :class="[
              'text-sm font-medium',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            ]">
              {{ displayValue }}
            </div>
            <div v-if="score !== null" :class="[
              'text-xs mt-1',
              getScoreColor()
            ]">
              {{ getScoreText() }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup>
import Card from 'primevue/card'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  displayValue: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    default: null
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const getScoreColor = () => {
  if (props.score === null) return props.isDarkMode ? 'text-gray-400' : 'text-gray-500'
  if (props.score >= 0.9) return 'text-green-500'
  if (props.score >= 0.5) return 'text-yellow-500'
  return 'text-red-500'
}

const getScoreText = () => {
  if (props.score === null) return ''
  if (props.score >= 0.9) return 'Good'
  if (props.score >= 0.5) return 'Needs Improvement'
  return 'Poor'
}
</script>
