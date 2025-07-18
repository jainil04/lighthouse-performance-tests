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

// Animation functions
const animateContainerEntry = () => {
  if (progressContainer.value) {
    // Set initial position: dragged down from top
    gsap.set(progressContainer.value, {
      y: -100,
      opacity: 0,
      scale: 0.9
    })

    // Animate down with bounce effect
    gsap.to(progressContainer.value, {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: "back.out(1.4)",
      clearProps: "transform"
    })
  }
}

const animateContainerExit = () => {
  if (progressContainer.value) {
    return gsap.to(progressContainer.value, {
      y: -100,
      opacity: 0,
      scale: 0.9,
      duration: 0.6,
      ease: "back.in(1.4)",
      onComplete: () => {
        // Hide the component from DOM after animation completes
        shouldShowComponent.value = false
      }
    })
  }
  return Promise.resolve()
}

const animateErrorState = () => {
  if (errorState.value) {
    const tl = gsap.timeline()

    tl.fromTo(errorIcon.value,
      { scale: 0, rotation: -180 },
      { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.7)" }
    )
    .fromTo(errorTitle.value,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      "-=0.2"
    )
    .fromTo(errorMessage.value,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      "-=0.2"
    )
  }
}

const animateRunningState = () => {
  if (runningState.value) {
    const tl = gsap.timeline()

    tl.fromTo(runningHeader.value,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    )
    .fromTo(progressBarContainer.value,
      { opacity: 0, scaleX: 0.8 },
      { opacity: 1, scaleX: 1, duration: 0.5, ease: "power2.out" },
      "-=0.2"
    )
    .fromTo(statusContainer.value,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      "-=0.2"
    )

    // Animate spinner with continuous rotation
    if (spinnerIcon.value) {
      gsap.to(spinnerIcon.value, {
        rotation: 360,
        duration: 1,
        repeat: -1,
        ease: "none"
      })
    }
  }
}

const animateCompletedState = () => {
  if (completedState.value) {
    const tl = gsap.timeline()

    tl.fromTo(completedHeader.value,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    )
    .fromTo(completedBarContainer.value,
      { opacity: 0, scaleX: 0.8 },
      { opacity: 1, scaleX: 1, duration: 0.5, ease: "power2.out" },
      "-=0.2"
    )
    .fromTo(successIcon.value,
      { scale: 0, rotation: -180 },
      { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.7)" },
      "-=0.1"
    )
    .fromTo(successMessage.value,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" },
      "-=0.3"
    )
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
