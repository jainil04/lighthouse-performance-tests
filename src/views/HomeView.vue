<script setup>
import { ref, inject, computed } from 'vue'
import WelcomeSection from '../components/ui/sections/WelcomeSection.vue'
import AuditProgress from '../components/ui/common/AuditProgress.vue'
import PerformanceMetrics from '../components/ui/sections/PerformanceMetrics.vue'
import AuditResults from '../components/ui/sections/AuditResults.vue'
import AverageMetricsChart from '../components/ui/common/AverageMetricsChart.vue'
import Footer from '../components/ui/common/Footer.vue'
import { useLighthouseAudit } from '../composables/useLighthouseAudit.js'

const urlValue = ref('')

// Sidebar selections - use injected values from App.vue
const currentDevice = inject('currentDevice', ref('desktop'))
const currentThrottle = inject('currentThrottle', ref('none'))
const currentRuns = inject('currentRuns', ref(1))
const currentAuditView = inject('currentAuditView', ref('standard'))

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

    <!-- Average Metrics Chart: Only show if runs > 1 -->
    <AverageMetricsChart
      v-if="currentRuns > 1 && metricsForChart.length > 0"
      :metrics="metricsForChart"
      :metric-labels="metricLabels"
      :is-dark-mode="isDarkMode"
    />

    <!-- System Status Footer -->
    <Footer
      :is-dark-mode="isDarkMode"
    />
  </div>
</template>
