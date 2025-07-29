<template>
  <Card :class="[
    'h-full transition-all duration-300 hover:shadow-lg hover:scale-105 group',
    'border-2 hover:border-opacity-50',
    isDarkMode
      ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 hover:border-gray-500'
      : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300'
  ]">
    <template #content>
      <div class="p-6 h-full flex flex-col justify-between">
        <!-- Header with Icon and Score -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center space-x-3">
            <!-- Dynamic Icon based on metric type -->
            <div :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center',
              getIconBackgroundColor(),
              'transition-all duration-300 group-hover:scale-110'
            ]">
              <i :class="[
                'text-lg',
                getIconClass(),
                'text-white'
              ]"></i>
            </div>
            <div>
              <h4 :class="[
                'text-sm font-medium leading-tight',
                isDarkMode ? 'text-white' : 'text-gray-900'
              ]">{{ title }}</h4>
            </div>
          </div>

          <!-- Score with circular progress indicator -->
          <div class="relative">
            <!-- Circular progress background -->
            <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                class="text-gray-200"
                :class="isDarkMode ? 'text-gray-700' : 'text-gray-200'"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                :class="getCircularProgressColor()"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                :stroke-dasharray="`${getCircularProgress()}, 100`"
                class="transition-all duration-1000 ease-out"
              />
            </svg>
            <!-- Score text in center -->
            <div class="absolute inset-0 flex items-center justify-center">
              <span :class="[
                'text-lg font-bold',
                getValueColor()
              ]">{{ getDisplayValue() }}</span>
            </div>
          </div>
        </div>

        <!-- Description with enhanced styling -->
        <div class="space-y-2">
          <p :class="[
            'text-xs leading-relaxed',
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          ]">{{ description }}</p>

          <!-- Performance indicator badge -->
          <div class="flex items-center justify-between">
            <span :class="[
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              getStatusBadgeColor()
            ]">
              <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="getStatusDotColor()"></span>
              {{ getStatusText() }}
            </span>

            <!-- Trend indicator (if we have trend data) -->
            <div v-if="trend" class="flex items-center space-x-1">
              <i :class="[
                'text-xs',
                trend > 0 ? 'pi pi-arrow-up text-green-500' : 'pi pi-arrow-down text-red-500'
              ]"></i>
              <span :class="[
                'text-xs font-medium',
                trend > 0 ? 'text-green-500' : 'text-red-500'
              ]">{{ Math.abs(trend) }}</span>
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
  },
  trend: {
    type: Number,
    default: null
  }
})

// Get display value (handle -- case)
const getDisplayValue = () => {
  return props.value === '--' ? '--' : props.value
}

// Get circular progress percentage for the ring
const getCircularProgress = () => {
  if (props.value === '--') return 0
  const numericValue = parseFloat(props.value)
  if (isNaN(numericValue)) return 0
  return Math.min(100, Math.max(0, numericValue))
}

// Get icon class based on metric type
const getIconClass = () => {
  const title = props.title.toLowerCase()
  if (title.includes('performance')) return 'pi pi-bolt'
  if (title.includes('accessibility')) return 'pi pi-eye'
  if (title.includes('best practices')) return 'pi pi-shield'
  if (title.includes('seo')) return 'pi pi-search'
  if (title.includes('layout shift')) return 'pi pi-arrows-alt'
  if (title.includes('paint') || title.includes('contentful')) return 'pi pi-palette'
  if (title.includes('interactive') || title.includes('blocking')) return 'pi pi-clock'
  return 'pi pi-chart-line'
}

// Get icon background color
const getIconBackgroundColor = () => {
  const numericValue = parseFloat(props.value)
  if (props.value === '--' || isNaN(numericValue)) return 'bg-gray-500'

  // Handle Lighthouse scores
  if (!props.value.includes('ms') && !props.value.includes('s') && !props.title.includes('Layout Shift')) {
    if (numericValue >= 90) return 'bg-green-500'
    if (numericValue >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Handle time-based metrics
  if (props.value.includes('ms') || props.value.includes('s')) {
    if (props.value.includes('s')) {
      if (numericValue <= 1.5) return 'bg-green-500'
      if (numericValue <= 3) return 'bg-yellow-500'
      return 'bg-red-500'
    } else {
      if (numericValue <= 100) return 'bg-green-500'
      if (numericValue <= 300) return 'bg-yellow-500'
      return 'bg-red-500'
    }
  }

  // Handle CLS
  if (props.title.includes('Layout Shift')) {
    if (numericValue <= 0.1) return 'bg-green-500'
    if (numericValue <= 0.25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return 'bg-gray-500'
}

// Get circular progress stroke color
const getCircularProgressColor = () => {
  const bgColor = getIconBackgroundColor()
  if (bgColor.includes('green')) return 'text-green-500'
  if (bgColor.includes('yellow')) return 'text-yellow-500'
  if (bgColor.includes('red')) return 'text-red-500'
  return 'text-gray-500'
}

// Get status text
const getStatusText = () => {
  const numericValue = parseFloat(props.value)
  if (props.value === '--' || isNaN(numericValue)) return 'No Data'

  // Handle Lighthouse scores
  if (!props.value.includes('ms') && !props.value.includes('s') && !props.title.includes('Layout Shift')) {
    if (numericValue >= 90) return 'Excellent'
    if (numericValue >= 50) return 'Needs Work'
    return 'Poor'
  }

  // Handle time-based metrics
  if (props.value.includes('ms') || props.value.includes('s')) {
    if (props.value.includes('s')) {
      if (numericValue <= 1.5) return 'Fast'
      if (numericValue <= 3) return 'Average'
      return 'Slow'
    } else {
      if (numericValue <= 100) return 'Fast'
      if (numericValue <= 300) return 'Average'
      return 'Slow'
    }
  }

  // Handle CLS
  if (props.title.includes('Layout Shift')) {
    if (numericValue <= 0.1) return 'Good'
    if (numericValue <= 0.25) return 'Needs Work'
    return 'Poor'
  }

  return 'Unknown'
}

// Get status badge color
const getStatusBadgeColor = () => {
  const status = getStatusText()
  if (status === 'Excellent' || status === 'Fast' || status === 'Good') {
    return props.isDarkMode
      ? 'bg-green-900 text-green-200'
      : 'bg-green-100 text-green-800'
  }
  if (status === 'Needs Work' || status === 'Average') {
    return props.isDarkMode
      ? 'bg-yellow-900 text-yellow-200'
      : 'bg-yellow-100 text-yellow-800'
  }
  if (status === 'Poor' || status === 'Slow') {
    return props.isDarkMode
      ? 'bg-red-900 text-red-200'
      : 'bg-red-100 text-red-800'
  }
  return props.isDarkMode
    ? 'bg-gray-700 text-gray-300'
    : 'bg-gray-100 text-gray-700'
}

// Get status dot color
const getStatusDotColor = () => {
  const status = getStatusText()
  if (status === 'Excellent' || status === 'Fast' || status === 'Good') return 'bg-green-400'
  if (status === 'Needs Work' || status === 'Average') return 'bg-yellow-400'
  if (status === 'Poor' || status === 'Slow') return 'bg-red-400'
  return 'bg-gray-400'
}

const getValueColor = () => {
  // Color coding based on typical performance thresholds
  const value = props.value

  // Handle Lighthouse scores (0-100 values without units)
  if (!isNaN(parseFloat(value)) && !value.includes('ms') && !value.includes('s') && !props.title.includes('Layout Shift')) {
    const numericValue = parseFloat(value)
    if (numericValue >= 90) return 'text-green-500'  // Good scores (90-100)
    if (numericValue >= 50) return 'text-yellow-500' // Average scores (50-89)
    return 'text-red-500'  // Poor scores (0-49)
  }

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
