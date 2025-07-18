<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div
      v-for="metric in metrics"
      :key="metric.key"
      class="score-card-wrapper relative overflow-hidden"
    >
      <!-- Background SparklineGradient -->
      <div class="absolute inset-0 z-0 w-full h-full">
        <SparklineGradient
          v-if="scores[metric.key] !== null"
          :data="getSparklineData(metric.key)"
          :stroke-color="getScoreColors(scores[metric.key]).stroke"
          :gradient-color="getScoreColors(scores[metric.key]).gradient"
          :height="120"
          :padding="8"
          class="w-full h-full"
        />
      </div>

      <!-- Foreground content overlaid on sparkline -->
      <div class="relative z-10 flex flex-col items-center justify-center min-h-[120px] p-6">
        <div class="text-3xl font-bold mb-2 text-white drop-shadow-lg">
          {{ scores[metric.key] }}
        </div>
        <div class="text-sm font-medium text-white opacity-90 drop-shadow-md">
          {{ metric.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SparklineGradient from './SparklineGradient.vue'

const metrics = [
  { key: 'performance', label: 'Performance' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'bestPractices', label: 'Best Practices' },
  { key: 'seo', label: 'SEO' }
]

const props = defineProps({
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

// Generate sparkline data based on the score
const getSparklineData = (metricKey) => {
  const score = props.scores[metricKey]
  const baseValue = score || 50  // Use 50 as base for wave generation when no score

  // Generate more data points for multiple curves (at least 12-15 points for 3+ curves)
  const data = Array.from({ length: 15 }, (_, i) => {
    // Create multiple wave patterns with different frequencies
    const primaryWave = Math.sin(i * 0.4) * 12        // Main wave
    const secondaryWave = Math.sin(i * 0.8) * 8       // Secondary wave
    const tertiaryWave = Math.sin(i * 1.2) * 4        // Tertiary wave
    const randomNoise = (Math.random() - 0.5) * 6     // Random variation

    // Combine all waves
    const totalVariation = primaryWave + secondaryWave + tertiaryWave + randomNoise

    return Math.max(0, Math.min(100, baseValue + totalVariation))
  })

  console.log(`SparklineGradient data for ${metricKey}:`, data)
  return data
}

// Get colors based on score ranges
const getScoreColors = (score) => {
  if (!score && score !== 0) {
    // Return default gray colors when no score is available
    return {
      stroke: '#6b7280',
      gradient: 'rgba(107, 114, 128, 0.4)'
    }
  }

  const numScore = typeof score === 'string' ? parseInt(score) : score

  if (numScore >= 90) {
    // Green for scores 90-100
    return {
      stroke: '#10b981',
      gradient: 'rgba(16, 185, 129, 0.4)'
    }
  } else if (numScore >= 50) {
    // Yellow for scores 50-89
    return {
      stroke: '#f59e0b',
      gradient: 'rgba(245, 158, 11, 0.4)'
    }
  } else {
    // Red for scores 0-49
    return {
      stroke: '#ef4444',
      gradient: 'rgba(239, 68, 68, 0.4)'
    }
  }
}
</script>

<style scoped>
.score-card-wrapper {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-height: 120px;
  position: relative;
  background: white;
}

/* Ensure text is highly visible over gradient background */
.score-card-wrapper .text-white {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}
</style>
