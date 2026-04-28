<script setup>
import { ref, inject, onMounted, computed, watch, onUnmounted } from 'vue'
import { useAuditHistory } from '../composables/useAuditHistory.js'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Paginator from 'primevue/paginator'
import Skeleton from 'primevue/skeleton'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip)

const isDarkMode = inject('isDarkMode', ref(false))
const { runs, total, page, limit, loading, error, fetchHistory } = useAuditHistory()

const urlFilter = ref('')

const badgeClass = (score) => {
  if (score === null || score === undefined) {
    return isDarkMode.value ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
  }
  if (score >= 90) return isDarkMode.value ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
  if (score >= 50) return isDarkMode.value ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
  return isDarkMode.value ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateStr))
}

const formatMs = (val) => {
  if (val === null || val === undefined) return '—'
  return (val / 1000).toFixed(1) + 's'
}

const formatCls = (val) => {
  if (val === null || val === undefined) return '—'
  return Number(val).toFixed(2)
}

const formatTbt = (val) => {
  if (val === null || val === undefined) return '—'
  return Math.round(val) + 'ms'
}

// Google CWV thresholds — values in ms except cls (raw score)
const cwvBadgeClass = (metric, val) => {
  if (val === null || val === undefined) {
    return isDarkMode.value ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
  }
  const thresholds = {
    fcp: [1800, 3000],
    lcp: [2500, 4000],
    si:  [3400, 5800],
    tbt: [200,  600],
    tti: [3800, 7300],
    cls: [0.1,  0.25],
  }
  const [good, poor] = thresholds[metric]
  if (val <= good) return isDarkMode.value ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
  if (val <= poor) return isDarkMode.value ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
  return isDarkMode.value ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
}

const load = (p = 1) => {
  fetchHistory({ page: p, limit: limit.value, url: urlFilter.value.trim() || null })
}

const onFilter = () => load(1)
const clearFilter = () => {
  urlFilter.value = ''
  load(1)
}
const onPageChange = (event) => load(event.page + 1)

onMounted(() => load(1))

// ── Trend chart ────────────────────────────────────────────────────────────
const chartCanvas = ref(null)
let chartInstance = null

const showChart = computed(() => urlFilter.value.trim() !== '' && runs.value.length >= 2)

const buildChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  if (!showChart.value || !chartCanvas.value) return

  // API returns newest-first; reverse so time flows left → right
  const sorted = [...runs.value].reverse()
  const labels = sorted.map(r =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(r.created_at))
  )

  const dark = isDarkMode.value
  const gridColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const tickColor = dark ? '#9ca3af' : '#6b7280'

  chartInstance = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Performance',
          data: sorted.map(r => r.scores.performance),
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          yAxisID: 'y',
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'LCP (ms)',
          data: sorted.map(r => r.scores.lcp),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'FCP (ms)',
          data: sorted.map(r => r.scores.fcp),
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'CLS (raw score)',
          data: sorted.map(r => r.scores.cls),
          borderColor: '#ec4899',
          backgroundColor: 'transparent',
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'TBT (ms)',
          data: sorted.map(r => r.scores.tbt),
          borderColor: '#8b5cf6',
          backgroundColor: 'transparent',
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: tickColor, usePointStyle: true, pointStyle: 'line', boxWidth: 30 },
        },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor },
        },
        y: {
          type: 'linear',
          position: 'left',
          min: 0,
          max: 100,
          grid: { color: gridColor },
          ticks: { color: tickColor },
          title: { display: true, text: 'Score (0–100)', color: tickColor, font: { size: 11 } },
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: tickColor },
          title: {
            display: true,
            text: 'LCP / FCP / TBT (ms)  ·  CLS (raw score)',
            color: tickColor,
            font: { size: 11 },
          },
        },
      },
    },
  })
}

// Rebuild whenever the data, filter state, or colour scheme changes.
// flush:'post' ensures chartCanvas.value is populated after v-if mounts the canvas.
watch([showChart, runs, isDarkMode], buildChart, { flush: 'post' })

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<template>
  <div>

    <!-- Page header -->
    <h1 :class="['text-2xl font-semibold mb-6', isDarkMode ? 'text-white' : 'text-gray-900']">
      Audit History
    </h1>

    <!-- URL filter -->
    <div class="flex gap-2 mb-6">
      <InputText
        v-model="urlFilter"
        placeholder="Filter by URL…"
        class="w-full max-w-sm"
        @keydown.enter="onFilter"
      />
      <Button icon="pi pi-search" label="Filter" @click="onFilter" />
      <Button
        v-if="urlFilter"
        icon="pi pi-times"
        severity="secondary"
        text
        aria-label="Clear filter"
        @click="clearFilter"
      />
    </div>

    <!-- Error -->
    <div
      v-if="error"
      :class="['mb-4 p-3 rounded-lg text-sm', isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800']"
    >
      {{ error }}
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-2">
      <div
        v-for="n in 6"
        :key="n"
        :class="[
          'flex gap-3 px-4 py-3 rounded-lg overflow-hidden',
          isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'
        ]"
      >
        <Skeleton class="shrink-0 w-48" height="1.25rem" />
        <Skeleton class="shrink-0 w-16" height="1.25rem" />
        <Skeleton class="shrink-0 w-28" height="1.25rem" />
        <Skeleton class="shrink-0 w-14" height="1.25rem" />
        <Skeleton class="shrink-0 w-14" height="1.25rem" />
        <Skeleton class="shrink-0 w-20" height="1.25rem" />
        <Skeleton class="shrink-0 w-12" height="1.25rem" />
        <Skeleton class="shrink-0 w-14" height="1.25rem" />
        <Skeleton class="shrink-0 w-14" height="1.25rem" />
        <Skeleton class="shrink-0 w-12" height="1.25rem" />
        <Skeleton class="shrink-0 w-12" height="1.25rem" />
        <Skeleton class="shrink-0 w-14" height="1.25rem" />
        <Skeleton class="shrink-0 w-14" height="1.25rem" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="runs.length === 0"
      :class="['flex flex-col items-center justify-center py-24 gap-3', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
    >
      <i class="pi pi-history text-6xl" />
      <p :class="['text-lg font-medium', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
        No audit runs yet.
      </p>
      <p class="text-sm">
        {{ urlFilter ? 'No results match that URL filter.' : 'Run your first audit on the home page.' }}
      </p>
    </div>

    <!-- Trend chart + table + pagination -->
    <template v-else>

      <!-- Trend chart — only when filtered by URL with ≥2 data points -->
      <div
        v-if="showChart"
        :class="['rounded-lg p-4 mb-6 border', isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']"
      >
        <h2 :class="['text-sm font-semibold mb-3', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
          Performance Trend
        </h2>
        <div style="position: relative; height: 260px;">
          <canvas ref="chartCanvas" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <DataTable :value="runs" class="w-full">
          <Column header="URL">
            <template #body="{ data }">
              <span
                class="font-mono text-sm block truncate max-w-xs"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'"
                :title="data.url"
              >
                {{ data.url }}
              </span>
            </template>
          </Column>

          <Column header="Device" style="width: 7rem">
            <template #body="{ data }">
              <span :class="['text-sm capitalize', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
                {{ data.device }}
              </span>
            </template>
          </Column>

          <Column header="Runs" style="width: 5rem">
            <template #body="{ data }">
              <span :class="['text-sm tabular-nums', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
                {{ data.runs_count }}
              </span>
            </template>
          </Column>

          <Column header="Date" style="width: 13rem">
            <template #body="{ data }">
              <span :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
                {{ formatDate(data.created_at) }}
              </span>
            </template>
          </Column>

          <Column header="Performance" style="width: 8rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', badgeClass(data.scores.performance)]">
                {{ data.scores.performance ?? '—' }}
              </span>
            </template>
          </Column>

          <Column header="Accessibility" style="width: 9rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', badgeClass(data.scores.accessibility)]">
                {{ data.scores.accessibility ?? '—' }}
              </span>
            </template>
          </Column>

          <Column header="Best Practices" style="width: 9rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', badgeClass(data.scores.best_practices)]">
                {{ data.scores.best_practices ?? '—' }}
              </span>
            </template>
          </Column>

          <Column header="SEO" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', badgeClass(data.scores.seo)]">
                {{ data.scores.seo ?? '—' }}
              </span>
            </template>
          </Column>

          <Column header="FCP" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('fcp', data.scores.fcp)]">
                {{ formatMs(data.scores.fcp) }}
              </span>
            </template>
          </Column>

          <Column header="LCP" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('lcp', data.scores.lcp)]">
                {{ formatMs(data.scores.lcp) }}
              </span>
            </template>
          </Column>

          <Column header="SI" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('si', data.scores.si)]">
                {{ formatMs(data.scores.si) }}
              </span>
            </template>
          </Column>

          <Column header="CLS" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('cls', data.scores.cls)]">
                {{ formatCls(data.scores.cls) }}
              </span>
            </template>
          </Column>

          <Column header="TBT" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('tbt', data.scores.tbt)]">
                {{ formatTbt(data.scores.tbt) }}
              </span>
            </template>
          </Column>

          <Column header="TTI" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('tti', data.scores.tti)]">
                {{ formatMs(data.scores.tti) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </div>

      <Paginator
        v-if="total > limit"
        :rows="limit"
        :total-records="total"
        :first="(page - 1) * limit"
        class="mt-4"
        @page="onPageChange"
      />
    </template>

  </div>
</template>
