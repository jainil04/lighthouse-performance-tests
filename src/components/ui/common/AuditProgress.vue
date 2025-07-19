<template>
  <div
    ref="progressContainer"
    v-if="shouldShowComponent"
    :class="[
      'rounded-lg shadow-sm border p-6',
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    ]"
  >
    <!-- Error State -->
    <div v-if="auditError" ref="errorState" class="text-center">
      <div ref="errorIcon" class="mb-4">
        <i class="pi pi-exclamation-triangle text-4xl text-red-500"></i>
      </div>
      <h3 ref="errorTitle" :class="[
        'text-lg font-medium mb-2 text-red-600'
      ]">Audit Failed</h3>
      <p ref="errorMessage" :class="[
        'text-sm',
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      ]">{{ auditError }}</p>
    </div>

    <!-- Running State -->
    <div v-else-if="isRunning" ref="runningState">
      <div ref="runningHeader" class="flex items-center justify-between mb-4">
        <h3 :class="[
          'text-lg font-medium',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]">Running Lighthouse Audit</h3>
        <span ref="progressPercent" :class="[
          'text-sm font-medium',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">{{ progress }}%</span>
      </div>

      <!-- Progress Bar -->
      <div ref="progressBarContainer">
        <ProgressBar
          :value="progress"
          :class="[
            'mb-4',
            isDarkMode ? 'p-progressbar-dark' : ''
          ]"
        />
      </div>

      <!-- Current Status -->
      <div ref="statusContainer" class="flex items-center space-x-2">
        <i ref="spinnerIcon" class="pi pi-spin pi-spinner text-blue-600"></i>
        <span ref="statusMessage" :class="[
          'text-sm',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">{{ currentMessage || 'Preparing audit...' }}</span>
      </div>

      <!-- Stage Indicator -->
      <div v-if="currentStage" ref="stageIndicator" class="mt-2">
        <span :class="[
          'inline-block px-2 py-1 text-xs rounded-full',
          isDarkMode
            ? 'bg-blue-900 text-blue-200'
            : 'bg-blue-100 text-blue-800'
        ]">{{ currentStage }}</span>
      </div>
    </div>

    <!-- Completed State -->
    <div v-else-if="progress >= 100" ref="completedState">
      <div ref="completedHeader" class="flex items-center justify-between mb-4">
        <h3 :class="[
          'text-lg font-medium',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]">Audit Completed</h3>
        <span ref="completedPercent" :class="[
          'text-sm font-medium text-green-600'
        ]">{{ progress }}%</span>
      </div>

      <!-- Completed Progress Bar -->
      <div ref="completedBarContainer">
        <ProgressBar
          :value="progress"
          :class="[
            'mb-4',
            isDarkMode ? 'p-progressbar-dark' : ''
          ]"
        />
      </div>

      <!-- Success Status -->
      <div ref="successStatus" class="flex items-center space-x-2">
        <i ref="successIcon" class="pi pi-check-circle text-green-600"></i>
        <span ref="successMessage" :class="[
          'text-sm',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">Lighthouse audit completed successfully!</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import ProgressBar from 'primevue/progressbar'
import { ref, watch, onMounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import {
  animateSlideDownEntry,
  animateSlideUpExit,
  animateCascade,
  animateIconEntry,
  animateSpinner
} from '../../../utils/animationUtils'

const props = defineProps({
  isRunning: Boolean,
  auditError: String,
  progress: Number,
  currentMessage: String,
  currentStage: String,
  isDarkMode: Boolean
})

// Component visibility control
const shouldShowComponent = ref(false)

// Template refs
const progressContainer = ref(null)
const errorState = ref(null)
const errorIcon = ref(null)
const errorTitle = ref(null)
const errorMessage = ref(null)
const runningState = ref(null)
const runningHeader = ref(null)
const progressPercent = ref(null)
const progressBarContainer = ref(null)
const statusContainer = ref(null)
const spinnerIcon = ref(null)
const statusMessage = ref(null)
const stageIndicator = ref(null)
const completedState = ref(null)
const completedHeader = ref(null)
const completedPercent = ref(null)
const completedBarContainer = ref(null)
const successStatus = ref(null)
const successIcon = ref(null)
const successMessage = ref(null)

// Animation functions using utilities
const animateContainerEntry = () => {
  animateSlideDownEntry(progressContainer.value)
}

const animateContainerExit = () => {
  return animateSlideUpExit(progressContainer.value, {
    onComplete: () => {
      shouldShowComponent.value = false
    }
  })
}

const animateErrorState = () => {
  const elements = [
    {
      element: errorTitle.value,
      from: { opacity: 0, y: 20 },
      to: { opacity: 1, y: 0 }
    },
    {
      element: errorMessage.value,
      from: { opacity: 0, y: 15 },
      to: { opacity: 1, y: 0 }
    }
  ].filter(item => item.element)

  // Animate icon separately
  if (errorIcon.value) {
    animateIconEntry(errorIcon.value)
  }

  // Animate other elements in cascade
  if (elements.length > 0) {
    animateCascade(elements)
  }
}

const animateRunningState = () => {
  const elements = [
    {
      element: runningHeader.value,
      from: { opacity: 0, y: -20 },
      to: { opacity: 1, y: 0 }
    },
    {
      element: progressBarContainer.value,
      from: { opacity: 0, scaleX: 0.8 },
      to: { opacity: 1, scaleX: 1 },
      duration: 0.5
    },
    {
      element: statusContainer.value,
      from: { opacity: 0, y: 20 },
      to: { opacity: 1, y: 0 }
    }
  ].filter(item => item.element)

  if (elements.length > 0) {
    animateCascade(elements)
  }

  // Start continuous spinner animation
  if (spinnerIcon.value) {
    animateSpinner(spinnerIcon.value)
  }
}

const animateCompletedState = () => {
  const elements = [
    {
      element: completedHeader.value,
      from: { opacity: 0, y: -20 },
      to: { opacity: 1, y: 0 }
    },
    {
      element: completedBarContainer.value,
      from: { opacity: 0, scaleX: 0.8 },
      to: { opacity: 1, scaleX: 1 },
      duration: 0.5
    },
    {
      element: successMessage.value,
      from: { opacity: 0, x: 20 },
      to: { opacity: 1, x: 0 }
    }
  ].filter(item => item.element)

  // Animate success icon separately
  if (successIcon.value) {
    setTimeout(() => {
      animateIconEntry(successIcon.value)
    }, 100)
  }

  // Animate other elements in cascade
  if (elements.length > 0) {
    animateCascade(elements)
  }
}

const animateProgressUpdate = () => {
  if (progressPercent.value) {
    gsap.fromTo(progressPercent.value,
      { scale: 1.2, color: "#3b82f6" },
      { scale: 1, color: "inherit", duration: 0.3, ease: "power2.out" }
    )
  }
}

const animateStageChange = () => {
  if (stageIndicator.value) {
    gsap.fromTo(stageIndicator.value,
      { opacity: 0, scale: 0.8, y: 10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
    )
  }
}

// Watch for state changes
watch(() => props.isRunning, (newVal) => {
  if (newVal) {
    shouldShowComponent.value = true
    nextTick(() => {
      animateContainerEntry()
      animateRunningState()
    })
  }
})

watch(() => props.auditError, (newVal) => {
  if (newVal) {
    shouldShowComponent.value = true
    nextTick(() => {
      animateContainerEntry()
      animateErrorState()
    })
  }
})

watch(() => props.progress, (newVal, oldVal) => {
  // Show component if progress starts (but wasn't running before)
  if (newVal > 0 && oldVal === 0 && !props.isRunning && !props.auditError) {
    shouldShowComponent.value = true
    nextTick(() => {
      animateContainerEntry()
      if (newVal >= 100) {
        animateCompletedState()
      }
    })
  }

  if (newVal >= 100 && oldVal < 100) {
    nextTick(() => {
      animateCompletedState()

      // After completion animation, wait 2 seconds then exit
      setTimeout(() => {
        animateContainerExit()
      }, 2000)
    })
  } else if (newVal > oldVal && props.isRunning) {
    animateProgressUpdate()
  }
})

watch(() => props.currentStage, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    nextTick(() => {
      animateStageChange()
    })
  }
})

// Initial animation on mount
onMounted(() => {
  if (props.isRunning || props.auditError || props.progress > 0) {
    shouldShowComponent.value = true
    nextTick(() => {
      animateContainerEntry()

      if (props.auditError) {
        animateErrorState()
      } else if (props.isRunning) {
        animateRunningState()
      } else if (props.progress >= 100) {
        animateCompletedState()
      }
    })
  }
})
</script>
