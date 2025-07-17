<template>
  <div :class="[
    'rounded-lg shadow-sm border p-6',
    isDarkMode
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200'
  ]">
    <div class="flex justify-between items-center mb-3">
      <h2 :class="[
        'text-xl font-semibold',
        isDarkMode ? 'text-white' : 'text-gray-900'
      ]">Audit Results</h2>
    </div>

    <!-- Standard View -->
    <div v-if="currentAuditView === 'standard'">
      <AuditTable
        :all-runs-data="allRunsData"
        :current-device="currentDevice"
        :current-throttle="currentThrottle"
        :current-runs="currentRuns"
        :is-dark-mode="isDarkMode"
      />
    </div>

    <!-- Full View - Comprehensive Report -->
    <div v-else-if="currentAuditView === 'full'">
      <div v-if="auditResults || Object.keys(detailedMetrics).length > 0">
        <DetailedMetrics
          :metrics="detailedMetrics"
          :opportunities="opportunities"
          :diagnostics="diagnostics"
          :isDarkMode="isDarkMode"
        />
      </div>
      <div v-else class="text-center py-8">
        <div class="mb-4">
          <i :class="[
            'pi pi-file-text text-6xl',
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          ]"></i>
        </div>
        <h3 :class="[
          'text-lg font-medium mb-2',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]">Comprehensive Audit Report</h3>
        <p :class="[
          'text-sm',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        ]">Detailed audit results and recommendations will appear here after running a test.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import AuditTable from '../common/AuditTable.vue'
import DetailedMetrics from '../common/DetailedMetrics.vue'

defineProps({
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
</script>
