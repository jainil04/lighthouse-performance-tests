<script setup>
import { ref, inject } from 'vue'
import WelcomeSection from '../components/ui/sections/WelcomeSection.vue'
import AuditProgress from '../components/ui/common/AuditProgress.vue'
import PerformanceMetrics from '../components/ui/sections/PerformanceMetrics.vue'
import AuditResults from '../components/ui/sections/AuditResults.vue'
import { useLighthouseAudit } from '../composables/useLighthouseAudit.js'

const urlValue = ref('')

// Sidebar selections
const currentDevice = ref('desktop')
const currentThrottle = ref('none')
const currentRuns = inject('currentRuns', ref(1))
const currentAuditView = ref('standard')

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
  allRunsData,
  runAudit
} = useLighthouseAudit()

// Event handlers
const handleUrlChange = (url) => {
  urlValue.value = url
  console.log('URL changed to:', url)
}

const handleDeviceChange = (device) => {
  currentDevice.value = device
  console.log('Device changed to:', device)
}

const handleThrottleChange = (throttle) => {
  currentThrottle.value = throttle
  console.log('Throttle changed to:', throttle)
}

const handleRunsChange = (runs) => {
  currentRuns.value = runs
  console.log('Runs changed to:', runs)
}

const handleAuditViewChange = (view) => {
  currentAuditView.value = view
  console.log('Audit view changed to:', view)
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

// Export handlers for parent AppLayout
defineExpose({
  handleDeviceChange,
  handleThrottleChange,
  handleRunsChange,
  handleAuditViewChange
})
</script>

<template>
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

    <!-- Performance Metrics -->
    <PerformanceMetrics
      v-if="isRunning || auditResults"
      :scores="scores"
      :is-dark-mode="isDarkMode"
    />

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
      :is-dark-mode="isDarkMode"
    />
  </div>
</template>
