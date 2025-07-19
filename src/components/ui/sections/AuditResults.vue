<template>
  <div
    ref="resultsContainer"
    v-if="shouldShowComponent"
    :class="[
      'rounded-lg shadow-sm border p-6',
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    ]"
  >
    <div ref="resultsHeader" class="flex justify-between items-center mb-3">
      <h2 :class="[
        'text-xl font-semibold',
        isDarkMode ? 'text-white' : 'text-gray-900'
      ]">Audit Results</h2>
    </div>

    <!-- Standard View -->
    <div v-if="currentAuditView === 'standard'" ref="standardViewContainer">
      <AuditTable
        :all-runs-data="allRunsData"
        :current-device="currentDevice"
        :current-throttle="currentThrottle"
        :current-runs="currentRuns"
        :is-dark-mode="isDarkMode"
      />
    </div>

    <!-- Full View - Comprehensive Report -->
    <div v-else-if="currentAuditView === 'full'" ref="fullViewContainer">
      <div v-if="auditResults || Object.keys(detailedMetrics).length > 0" ref="detailedContent">
        <DetailedMetrics
          :metrics="detailedMetrics"
          :opportunities="opportunities"
          :diagnostics="diagnostics"
          :isDarkMode="isDarkMode"
        />
      </div>
      <div v-else ref="emptyStateContent" class="text-center py-8">
        <div ref="emptyStateIcon" class="mb-4">
          <i :class="[
            'pi pi-file-text text-6xl',
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          ]"></i>
        </div>
        <h3 ref="emptyStateTitle" :class="[
          'text-lg font-medium mb-2',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]">Comprehensive Audit Report</h3>
        <p ref="emptyStateDescription" :class="[
          'text-sm',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">Detailed audit results and recommendations will appear here after running a test.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import AuditTable from '../common/AuditTable.vue'
import {
  animateSlideDownEntry,
  animateSlideUpExit,
  animateCascade,
  animateIconEntry
} from '../../../utils/animationUtils'

const props = defineProps({
  currentAuditView: String,
  allRunsData: Array,
  currentDevice: String,
  currentThrottle: String,
  currentRuns: Number,
  auditResults: Object,
  detailedMetrics: Object,
  opportunities: Object,
  diagnostics: Object,
  isDarkMode: Boolean
})

// Component visibility control
const shouldShowComponent = ref(false)

// Template refs
const resultsContainer = ref(null)
const resultsHeader = ref(null)
const standardViewContainer = ref(null)
const fullViewContainer = ref(null)
const detailedContent = ref(null)
const emptyStateContent = ref(null)
const emptyStateIcon = ref(null)
const emptyStateTitle = ref(null)
const emptyStateDescription = ref(null)

// Computed property to check if there's any data to show
const hasAuditData = computed(() => {
  return (props.allRunsData && props.allRunsData.length > 0) ||
         (props.auditResults && Object.keys(props.auditResults).length > 0) ||
         (props.detailedMetrics && Object.keys(props.detailedMetrics).length > 0)
})

// Animation functions using utilities
const animateContainerEntry = () => {
  animateSlideDownEntry(resultsContainer.value)
}

const animateContainerExit = () => {
  return animateSlideUpExit(resultsContainer.value, {
    onComplete: () => {
      shouldShowComponent.value = false
    }
  })
}

const animateContent = () => {
  const elements = [
    {
      element: resultsHeader.value,
      from: { opacity: 0, y: -20 },
      to: { opacity: 1, y: 0 }
    }
  ]

  // Add content based on current view
  if (props.currentAuditView === 'standard' && standardViewContainer.value) {
    elements.push({
      element: standardViewContainer.value,
      from: { opacity: 0, y: 20 },
      to: { opacity: 1, y: 0 },
      duration: 0.5
    })
  } else if (props.currentAuditView === 'full') {
    if (detailedContent.value) {
      elements.push({
        element: detailedContent.value,
        from: { opacity: 0, y: 20 },
        to: { opacity: 1, y: 0 },
        duration: 0.5
      })
    } else if (emptyStateContent.value) {
      // Use icon animation utility for the icon
      if (emptyStateIcon.value) {
        setTimeout(() => {
          animateIconEntry(emptyStateIcon.value)
        }, 200)
      }

      // Add title and description to cascade
      elements.push(
        {
          element: emptyStateTitle.value,
          from: { opacity: 0, y: 15 },
          to: { opacity: 1, y: 0 }
        },
        {
          element: emptyStateDescription.value,
          from: { opacity: 0, y: 10 },
          to: { opacity: 1, y: 0 }
        }
      )
    }
  }

  // Filter out null elements and animate
  const validElements = elements.filter(item => item.element)
  if (validElements.length > 0) {
    animateCascade(validElements)
  }
}

// Watch for audit data changes to show/hide component
watch(() => hasAuditData.value, (hasData, hadData) => {
  if (hasData && !hadData) {
    // Show component when audit data first appears
    shouldShowComponent.value = true
    nextTick(() => {
      animateContainerEntry()
      setTimeout(() => {
        animateContent()
      }, 200)
    })
  } else if (!hasData && hadData) {
    // Hide component when audit data is cleared
    animateContainerExit()
  }
})

// Watch for audit view changes to re-animate content
watch(() => props.currentAuditView, () => {
  if (shouldShowComponent.value) {
    nextTick(() => {
      animateContent()
    })
  }
})

// Initial check on mount
onMounted(() => {
  if (hasAuditData.value) {
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
