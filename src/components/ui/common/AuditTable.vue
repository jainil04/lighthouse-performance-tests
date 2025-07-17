<template>
  <div>
    <!-- Test Configuration Note -->
    <div v-if="allRunsData.length > 0" :class="[
      'mb-4 p-3 rounded-lg border',
      isDarkMode
        ? 'bg-gray-700 border-gray-600'
        : 'bg-gray-50 border-gray-200'
    ]">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-1">
            <i :class="[
              'pi',
              currentDevice === 'desktop' ? 'pi-desktop' : 'pi-mobile',
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            ]"></i>
            <span :class="[
              'font-medium',
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            ]">Device:</span>
            <span :class="[
              'capitalize',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            ]">{{ currentDevice }}</span>
          </div>

          <div class="flex items-center gap-1">
            <i :class="[
              'pi pi-wifi',
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            ]"></i>
            <span :class="[
              'font-medium',
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            ]">Network:</span>
            <span :class="[
              'capitalize',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            ]">{{ currentThrottle === 'none' ? 'No throttling' : currentThrottle }}</span>
          </div>

          <div class="flex items-center gap-1">
            <i :class="[
              'pi pi-refresh',
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            ]"></i>
            <span :class="[
              'font-medium',
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            ]">Runs:</span>
            <span :class="[
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            ]">{{ currentRuns }}</span>
          </div>
        </div>

        <!-- Export Button -->
        <Button
          icon="pi pi-download"
          :class="[
            'p-button-outlined p-button-sm',
            isDarkMode ? 'p-button-secondary' : ''
          ]"
          @click="exportCSV"
        />
      </div>
    </div>

    <div v-if="allRunsData.length > 0">
      <DataTable
        ref="dt"
        :value="allRunsData"
        :class="[
          'p-datatable-sm',
          isDarkMode ? 'p-datatable-dark' : ''
        ]"
        stripedRows
        responsiveLayout="scroll"
        :filters="filters"
        filterDisplay="menu"
        :globalFilterFields="['run', 'fcp', 'lcp', 'tti', 'cls', 'si', 'tbt', 'srt']"
        exportFilename="lighthouse-audit-results"
      >
        <Column field="run" header="Run" :sortable="true" headerStyle="width: 80px;">
          <template #body="{ data }">
            Run {{ data.run }}
          </template>
        </Column>

        <Column field="fcp" header="FCP" :sortable="true">
          <template #body="{ data }">
            {{ formatMetricValue(data.fcp) }}
          </template>
        </Column>

        <Column field="lcp" header="LCP" :sortable="true">
          <template #body="{ data }">
            {{ formatMetricValue(data.lcp) }}
          </template>
        </Column>

        <Column field="tti" header="TTI" :sortable="true">
          <template #body="{ data }">
            {{ formatMetricValue(data.tti) }}
          </template>
        </Column>

        <Column field="cls" header="CLS" :sortable="true">
          <template #body="{ data }">
            {{ formatMetricValue(data.cls, false) }}
          </template>
        </Column>

        <Column field="si" header="SI" :sortable="true">
          <template #body="{ data }">
            {{ formatMetricValue(data.si) }}
          </template>
        </Column>

        <Column field="tbt" header="TBT" :sortable="true">
          <template #body="{ data }">
            {{ formatMetricValue(data.tbt) }}
          </template>
        </Column>

        <Column field="srt" header="SRT" :sortable="true">
          <template #body="{ data }">
            {{ formatMetricValue(data.srt) }}
          </template>
        </Column>
      </DataTable>
    </div>

    <div v-else class="text-center py-8">
      <div class="mb-4">
        <i :class="[
          'pi pi-table text-6xl',
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        ]"></i>
      </div>
      <h3 :class="[
        'text-lg font-medium mb-2',
        isDarkMode ? 'text-white' : 'text-gray-900'
      ]">Audit Runs Table</h3>
      <p :class="[
        'text-sm',
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      ]">Run multiple tests to see a comparison table of all your audit results.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'

defineProps({
  allRunsData: Array,
  currentDevice: String,
  currentThrottle: String,
  currentRuns: Number,
  isDarkMode: Boolean
})

const dt = ref()

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  run: { value: null, matchMode: FilterMatchMode.EQUALS },
  fcp: { value: null, matchMode: FilterMatchMode.GREATER_THAN },
  lcp: { value: null, matchMode: FilterMatchMode.GREATER_THAN },
  tti: { value: null, matchMode: FilterMatchMode.GREATER_THAN },
  cls: { value: null, matchMode: FilterMatchMode.GREATER_THAN },
  si: { value: null, matchMode: FilterMatchMode.GREATER_THAN },
  tbt: { value: null, matchMode: FilterMatchMode.GREATER_THAN },
  srt: { value: null, matchMode: FilterMatchMode.GREATER_THAN }
})

const formatMetricValue = (value, isTime = true) => {
  if (!value && value !== 0) return '-'

  if (isTime) {
    if (value < 1000) return `${Math.round(value)} ms`
    return `${(value / 1000).toFixed(1)} s`
  } else {
    // For CLS (not time-based)
    return value.toFixed(3)
  }
}

const exportCSV = () => {
  if (dt.value) {
    dt.value.exportCSV()
  }
}
</script>
