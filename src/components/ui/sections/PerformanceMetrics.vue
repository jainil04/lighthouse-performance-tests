<template>
  <div
    ref="metricsContainer"
    v-if="shouldShowComponent"
    :class="[
      'rounded-lg shadow-sm border p-6',
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    ]"
  >
    <h2 ref="metricsTitle" :class="[
      'text-xl font-semibold mb-3',
      isDarkMode ? 'text-white' : 'text-gray-900'
    ]">Performance Metrics</h2>
    <p ref="metricsDescription" :class="[
      'mb-4',
      isDarkMode ? 'text-gray-300' : 'text-gray-600'
    ]">Your performance testing results will appear here.</p>

    <!-- Score Cards -->
    <div ref="scoreCardsContainer">
      <ScoreCards
        :is-dark-mode="isDarkMode"
        :scores="scores"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import ScoreCards from '../common/ScoreCards.vue'
import {
  animateSlideDownEntry,
  animateSlideUpExit,
  animateCascade
} from '../../../utils/animationUtils'

const props = defineProps({
  scores: Object,
  isDarkMode: Boolean
})

// Component visibility control
const shouldShowComponent = ref(false)

// Template refs
const metricsContainer = ref(null)
const metricsTitle = ref(null)
const metricsDescription = ref(null)
const scoreCardsContainer = ref(null)

// Animation functions using utilities
const animateContainerEntry = () => {
  animateSlideDownEntry(metricsContainer.value)
}

const animateContainerExit = () => {
  return animateSlideUpExit(metricsContainer.value, {
    onComplete: () => {
      shouldShowComponent.value = false
    }
  })
}

const animateContent = () => {
  const elements = [
    {
      element: metricsTitle.value,
      from: { opacity: 0, y: -20 },
      to: { opacity: 1, y: 0 }
    },
    {
      element: metricsDescription.value,
      from: { opacity: 0, y: 15 },
      to: { opacity: 1, y: 0 }
    },
    {
      element: scoreCardsContainer.value,
      from: { opacity: 0, y: 20 },
      to: { opacity: 1, y: 0 },
      duration: 0.5
    }
  ].filter(item => item.element)

  if (elements.length > 0) {
    animateCascade(elements)
  }
}

// Watch for scores changes to show/hide component
watch(() => props.scores, (newScores, oldScores) => {
  const hasScores = newScores && Object.keys(newScores).length > 0
  const hadScores = oldScores && Object.keys(oldScores).length > 0

  if (hasScores && !hadScores) {
    // Show component when scores first appear
    shouldShowComponent.value = true
    nextTick(() => {
      animateContainerEntry()
      setTimeout(() => {
        animateContent()
      }, 200)
    })
  } else if (!hasScores && hadScores) {
    // Hide component when scores are cleared
    animateContainerExit()
  }
}, { deep: true })

// Initial check on mount
onMounted(() => {
  const hasScores = props.scores && Object.keys(props.scores).length > 0
  if (hasScores) {
    shouldShowComponent.value = true
    nextTick(() => {
      animateContainerEntry()
      setTimeout(() => {
        animateContent()
      }, 200)
    })
  }
})
</script>
