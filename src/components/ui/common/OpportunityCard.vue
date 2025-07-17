<template>
  <Card :class="[
    'transition-all duration-200',
    isDarkMode
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200'
  ]">
    <template #content>
      <div class="p-4">
        <div class="flex items-start justify-between mb-2">
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
            <div v-if="savingsMs > 0" :class="[
              'text-sm font-semibold',
              getSavingsColor()
            ]">
              {{ formatTime(savingsMs) }}
            </div>
            <div v-if="savingsBytes > 0" :class="[
              'text-xs',
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            ]">
              {{ formatBytes(savingsBytes) }}
            </div>
          </div>
        </div>

        <!-- Priority indicator -->
        <div class="flex items-center mt-2">
          <div :class="[
            'h-1 flex-1 rounded-full mr-2',
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          ]">
            <div
              :class="[
                'h-1 rounded-full transition-all duration-300',
                getPriorityColor()
              ]"
              :style="{ width: getPriorityWidth() }"
            ></div>
          </div>
          <span :class="[
            'text-xs font-medium',
            getPriorityTextColor()
          ]">{{ getPriorityLabel() }}</span>
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
  savingsMs: {
    type: Number,
    default: 0
  },
  savingsBytes: {
    type: Number,
    default: 0
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

const formatTime = (ms) => {
  if (!ms || ms === 0) return '0ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`
}

const getSavingsColor = () => {
  if (props.savingsMs > 500) return 'text-red-500'
  if (props.savingsMs > 150) return 'text-yellow-500'
  return 'text-green-500'
}

const getPriorityWidth = () => {
  if (props.score === null) return '50%'
  return `${(1 - props.score) * 100}%`
}

const getPriorityColor = () => {
  if (props.score === null) return 'bg-gray-400'
  if (props.score >= 0.9) return 'bg-green-500'
  if (props.score >= 0.5) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getPriorityTextColor = () => {
  if (props.score === null) return props.isDarkMode ? 'text-gray-400' : 'text-gray-500'
  if (props.score >= 0.9) return 'text-green-500'
  if (props.score >= 0.5) return 'text-yellow-500'
  return 'text-red-500'
}

const getPriorityLabel = () => {
  if (props.score === null) return 'Medium'
  if (props.score >= 0.9) return 'Low'
  if (props.score >= 0.5) return 'Medium'
  return 'High'
}
</script>
