<template>
  <Card :class="[
    'h-full transition-all duration-200 hover:shadow-md',
    isDarkMode
      ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
      : 'bg-white border-gray-200 hover:bg-gray-50'
  ]">
    <template #content>
      <div class="p-4">
        <div class="flex items-start justify-between mb-2">
          <h4 :class="[
            'text-sm font-medium',
            isDarkMode ? 'text-white' : 'text-gray-900'
          ]">{{ title }}</h4>
          <span :class="[
            'text-lg font-bold',
            getValueColor()
          ]">{{ value }}</span>
        </div>
        <p :class="[
          'text-xs',
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        ]">{{ description }}</p>
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
  value: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const getValueColor = () => {
  // Color coding based on typical performance thresholds
  const value = props.value

  // For time-based metrics
  if (value.includes('ms') || value.includes('s')) {
    const numericValue = parseFloat(value)
    if (value.includes('s')) {
      if (numericValue <= 1.5) return 'text-green-500'
      if (numericValue <= 3) return 'text-yellow-500'
      return 'text-red-500'
    } else {
      if (numericValue <= 100) return 'text-green-500'
      if (numericValue <= 300) return 'text-yellow-500'
      return 'text-red-500'
    }
  }

  // For CLS
  if (props.title.includes('Layout Shift')) {
    const numericValue = parseFloat(value)
    if (numericValue <= 0.1) return 'text-green-500'
    if (numericValue <= 0.25) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Default color
  return props.isDarkMode ? 'text-gray-300' : 'text-gray-700'
}
</script>
