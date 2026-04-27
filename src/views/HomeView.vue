<script setup>
import { watch } from 'vue'
import { ref, inject, computed } from 'vue'
import WelcomeSection from '../components/ui/sections/WelcomeSection.vue'
import AuditProgress from '../components/ui/common/AuditProgress.vue'
import PerformanceMetrics from '../components/ui/sections/PerformanceMetrics.vue'
import AuditResults from '../components/ui/sections/AuditResults.vue'
import AverageMetricsChart from '../components/ui/common/AverageMetricsChart.vue'
import { useLighthouseAudit } from '../composables/useLighthouseAudit.js'
import pop from '../assets/pop.mp3'
import { useSound } from '../composables/useSound.js'

const urlValue = ref('')

// Sidebar selections - use injected values from App.vue
const currentDevice = inject('currentDevice', ref('desktop'))
const currentThrottle = inject('currentThrottle', ref('none'))
const currentRuns = inject('currentRuns', ref(1))
const currentAuditView = inject('currentAuditView', ref('standard'))
const { play: playOn } = useSound({ src: pop, volume: 0.5 })


// Use composable for audit logic
const {
  isRunning,
  progress,
  currentStage,
  currentMessage,
  auditError,
  auditResults,
  scores,
  detailedMetrics,
  opportunities,
  diagnostics,
  fullReport,
  allRunsData,
  notificationVisible,
  dismissNotification,
  runAudit
} = useLighthouseAudit()

// Event handlers
const handleUrlChange = (url) => {
  urlValue.value = url
  console.log('URL changed to:', url)
}

const handleUrlSubmit = async () => {
  console.log('URL submitted:', urlValue.value)
  console.log('Device:', currentDevice.value)
  console.log('Throttle:', currentThrottle.value)
  console.log('Runs:', currentRuns.value)
  console.log('Audit View:', currentAuditView.value)

  if (!urlValue.value) {
    console.warn('No URL provided')
    return
  }

  const auditConfig = {
    url: urlValue.value,
    device: currentDevice.value,
    throttle: currentThrottle.value,
    runs: currentRuns.value,
    auditView: currentAuditView.value
  }

  await runAudit(auditConfig)
}

// Inject these values to child components
const isDarkMode = inject('isDarkMode', ref(false))

// Prepare chart data for AverageMetricsChart
const metricLabels = ref(['FCP', 'LCP', 'CLS', 'TTI', 'SI', 'TBT']) // Example, update as needed
const metricsForChart = computed(() => {
  if (!allRunsData || !Array.isArray(allRunsData.value) || allRunsData.value.length === 0) return [];
  const avgValues = {};
  metricLabels.value.forEach(label => {
    const key = label.toLowerCase();
    // Collect all values for this metric
    const valuesArr = allRunsData.value.map(runData => runData[key]).filter(v => typeof v === 'number');
    avgValues[label] = valuesArr.length > 0
      ? valuesArr.reduce((sum, v) => sum + v, 0) / valuesArr.length
      : null;
  });
  return [{ run: 'Avg', values: avgValues }];
});


// Play pop sound when progress reaches 100
watch(progress, (newVal, oldVal) => {
  if (newVal === 100 && oldVal !== 100) {
    playOn()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="audit-toast">
      <div
        v-if="notificationVisible"
        :class="[
          'fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border',
          isDarkMode
            ? 'bg-green-900 border-green-700 text-green-200'
            : 'bg-green-50 border-green-200 text-green-800'
        ]"
        role="status"
        aria-live="polite"
      >
        <span class="text-sm font-medium">Audit complete ✓</span>
        <button
          @click="dismissNotification"
          :class="[
            'ml-1 rounded p-0.5 transition-colors',
            isDarkMode ? 'hover:bg-green-800 text-green-300' : 'hover:bg-green-100 text-green-600'
          ]"
          aria-label="Dismiss notification"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>

  <div class="space-y-6">
    <!-- Welcome Section -->
    <WelcomeSection
      :url="urlValue"
      :is-dark-mode="isDarkMode"
      :is-running="isRunning"
      :current-device="currentDevice"
      :current-throttle="currentThrottle"
      :current-runs="currentRuns"
      @url-change="handleUrlChange"
      @submit="handleUrlSubmit"
    />

    <!-- Progress Section -->
    <AuditProgress
      :is-running="isRunning"
      :audit-error="auditError"
      :progress="progress"
      :current-message="currentMessage"
      :current-stage="currentStage"
      :is-dark-mode="isDarkMode"
    />

    <!-- Performance Metrics & Average Metrics Chart Side by Side -->
    <div :class="currentRuns > 1 ? 'flex flex-col lg:flex-row gap-6' : ''">
      <div :class="currentRuns > 1 ? 'flex-1' : 'w-full'">
        <PerformanceMetrics
          v-if="isRunning || auditResults"
          :scores="scores"
          :is-dark-mode="isDarkMode"
        />
      </div>
      <div v-if="currentRuns > 1" class="flex-1">
        <AverageMetricsChart
          v-if="metricsForChart.length > 0"
          :metrics="metricsForChart"
          :metric-labels="metricLabels"
          :is-dark-mode="isDarkMode"
        />
      </div>
    </div>


    <!-- Audit Results -->
    <AuditResults
      v-if="isRunning || auditResults"
      :current-audit-view="currentAuditView"
      :all-runs-data="allRunsData"
      :current-device="currentDevice"
      :current-throttle="currentThrottle"
      :current-runs="currentRuns"
      :audit-results="auditResults"
      :detailed-metrics="detailedMetrics"
      :opportunities="opportunities"
      :diagnostics="diagnostics"
      :full-report="fullReport"
      :is-dark-mode="isDarkMode"
    />

  </div>
</template>

<style scoped>
.audit-toast-enter-active,
.audit-toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.audit-toast-enter-from,
.audit-toast-leave-to {
  opacity: 0;
  transform: translateX(0.75rem);
}
</style>
