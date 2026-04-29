<script setup>
import { ref, inject, onMounted, computed, watch, onUnmounted, reactive } from 'vue'
import { useAuditHistory } from '../composables/useAuditHistory.js'
import { useAlertConfigs } from '../composables/useAlertConfigs.js'
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
const token = inject('token', ref(null))
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

// ── Scheduled audits ───────────────────────────────────────────────────────
const scheduledTargets = ref([])
const showScheduleModal = ref(false)
const scheduleModalError = ref('')
const scheduleModalSuccess = ref(false)
const scheduleSubmitting = ref(false)
const selectedSchedule = ref('')
const comingSoonVisible = ref(false)

const CRON_LABELS = {
  '0 9 * * *': 'Daily',
  '0 9 * * 1': 'Weekly',
  '0 9 1 * *': 'Monthly',
}
const cronToLabel = (cron) => CRON_LABELS[cron] ?? cron

const currentFilterUrl = computed(() => urlFilter.value.trim())

const filteredUrlTarget = computed(() =>
  scheduledTargets.value.find(t => t.url === currentFilterUrl.value) ?? null
)

const isAlreadyScheduled = computed(() => filteredUrlTarget.value !== null)

const isAtScheduleLimit = computed(() =>
  scheduledTargets.value.length >= 5 && !isAlreadyScheduled.value
)

const fetchScheduledTargets = async () => {
  if (!token.value) return
  try {
    const res = await fetch('/api/jobs', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    if (!res.ok) return
    const data = await res.json()
    scheduledTargets.value = data.targets ?? []
  } catch { /* ignore */ }
}

const openScheduleModal = () => {
  scheduleModalError.value = ''
  scheduleModalSuccess.value = false
  comingSoonVisible.value = false
  selectedSchedule.value = filteredUrlTarget.value?.schedule ?? ''
  showScheduleModal.value = true
}

const closeScheduleModal = () => {
  showScheduleModal.value = false
  scheduleModalError.value = ''
  scheduleModalSuccess.value = false
  comingSoonVisible.value = false
  selectedSchedule.value = ''
}

const submitSchedule = async () => {
  if (!selectedSchedule.value || scheduleSubmitting.value) return
  scheduleSubmitting.value = true
  scheduleModalError.value = ''
  scheduleModalSuccess.value = false
  try {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        url: currentFilterUrl.value,
        device: 'desktop',
        runs: 1,
        schedule: selectedSchedule.value,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      scheduleModalError.value = data.error === 'Maximum 5 scheduled URLs allowed'
        ? "You've reached the limit of 5 scheduled URLs"
        : (data.error ?? 'Failed to schedule audit')
      return
    }
    scheduleModalSuccess.value = true
    const idx = scheduledTargets.value.findIndex(t => t.url === currentFilterUrl.value)
    if (idx >= 0) {
      scheduledTargets.value[idx] = { ...scheduledTargets.value[idx], schedule: selectedSchedule.value }
    } else {
      scheduledTargets.value.push({ url: currentFilterUrl.value, schedule: selectedSchedule.value })
    }
    setTimeout(closeScheduleModal, 1500)
  } catch {
    scheduleModalError.value = 'Network error — please try again'
  } finally {
    scheduleSubmitting.value = false
  }
}

const removeSchedule = () => {
  comingSoonVisible.value = true
  setTimeout(() => { comingSoonVisible.value = false }, 3000)
}

// ── Alerts ─────────────────────────────────────────────────────────────────
const {
  configs: alertConfigs,
  loading: alertsLoading,
  error: alertsError,
  fetchAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
} = useAlertConfigs()

const filteredTargetId = computed(() =>
  urlFilter.value.trim() && runs.value.length > 0 ? (runs.value[0]?.target_id ?? null) : null
)

const showAlerts = computed(() =>
  !!urlFilter.value.trim() && !!token.value && filteredTargetId.value !== null
)

const ALERT_METRICS = [
  { value: 'performance',    label: 'Performance' },
  { value: 'accessibility',  label: 'Accessibility' },
  { value: 'best_practices', label: 'Best Practices' },
  { value: 'seo',            label: 'SEO' },
  { value: 'fcp',            label: 'FCP' },
  { value: 'lcp',            label: 'LCP' },
  { value: 'cls',            label: 'CLS' },
  { value: 'tbt',            label: 'TBT' },
  { value: 'si',             label: 'Speed Index' },
  { value: 'tti',            label: 'TTI' },
]

const SCORE_METRICS = new Set(['performance', 'accessibility', 'best_practices', 'seo'])

const availableMetrics = computed(() => {
  const used = new Set(alertConfigs.value.map(c => c.metric))
  return ALERT_METRICS.filter(m => !used.has(m.value))
})

// Per-row edit state keyed by config id
const alertEdits = reactive({})

const initAlertEdit = (config) => {
  if (!alertEdits[config.id]) {
    alertEdits[config.id] = {
      threshold: config.threshold,
      comparison: config.comparison,
      enabled: config.enabled,
      saving: false,
      error: null,
    }
  }
}

watch(alertConfigs, (newConfigs) => {
  for (const c of newConfigs) initAlertEdit(c)
}, { immediate: true })

const handleSaveAlert = async (configId) => {
  const edit = alertEdits[configId]
  if (!edit || edit.saving) return
  edit.saving = true
  edit.error = null
  try {
    await updateAlert(configId, {
      threshold: Number(edit.threshold),
      comparison: edit.comparison,
      enabled: edit.enabled,
    })
  } catch (err) {
    edit.error = err.message
  } finally {
    edit.saving = false
  }
}

const handleDeleteAlert = async (configId) => {
  const edit = alertEdits[configId]
  if (edit) edit.error = null
  try {
    await deleteAlert(configId)
    delete alertEdits[configId]
  } catch (err) {
    if (alertEdits[configId]) alertEdits[configId].error = err.message
  }
}

const newAlert = reactive({ metric: '', threshold: '', comparison: 'below', submitting: false, error: null })

const onNewAlertMetricChange = () => {
  // Default comparison: 'below' for score metrics, 'above' for CWV/time metrics
  newAlert.comparison = SCORE_METRICS.has(newAlert.metric) ? 'below' : 'above'
}

const handleAddAlert = async () => {
  if (!newAlert.metric || newAlert.threshold === '' || newAlert.submitting) return
  if (!filteredTargetId.value) return
  newAlert.submitting = true
  newAlert.error = null
  try {
    await createAlert({
      target_id: filteredTargetId.value,
      metric: newAlert.metric,
      threshold: Number(newAlert.threshold),
      comparison: newAlert.comparison,
    })
    newAlert.metric = ''
    newAlert.threshold = ''
    newAlert.comparison = 'below'
  } catch (err) {
    newAlert.error = err.message
  } finally {
    newAlert.submitting = false
  }
}

// Re-fetch alerts when URL filter + runs change
watch([currentFilterUrl, runs], ([url, newRuns]) => {
  if (url && newRuns.length > 0 && token.value) {
    fetchAlerts(newRuns[0].target_id)
  } else {
    alertConfigs.value = []
  }
})

onMounted(() => {
  load(1)
  fetchScheduledTargets()
})

// ── Trend chart ────────────────────────────────────────────────────────────
const chartCanvas = ref(null)
let chartInstance = null

const showChart = computed(() => urlFilter.value.trim() !== '' && runs.value.length >= 2)

const regressionMap = computed(() => {
  if (!urlFilter.value.trim() || runs.value.length < 2) return new Set()
  const latest = runs.value[0]
  const previous = runs.value.slice(1)
  const avg = (metric) => {
    const vals = previous.map(r => r.scores[metric]).filter(v => v !== null && v !== undefined)
    return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length
  }
  const regressed = new Set()
  for (const metric of ['performance', 'accessibility', 'best_practices', 'seo']) {
    const base = avg(metric)
    const cur = latest.scores[metric]
    if (base !== null && cur !== null && cur !== undefined && base - cur >= 10) regressed.add(metric)
  }
  for (const metric of ['lcp', 'fcp', 'tbt', 'si', 'tti']) {
    const base = avg(metric)
    const cur = latest.scores[metric]
    if (base !== null && cur !== null && cur !== undefined && base > 0 && cur >= base * 1.2) regressed.add(metric)
  }
  const clsBase = avg('cls')
  const clsCur = latest.scores['cls']
  if (clsBase !== null && clsCur !== null && clsCur !== undefined && clsCur - clsBase >= 0.1) regressed.add('cls')
  return regressed
})

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
      <span
        v-if="urlFilter && token"
        class="inline-flex"
        :title="isAtScheduleLimit ? 'Maximum 5 scheduled URLs reached' : ''"
      >
        <Button
          icon="pi pi-clock"
          :label="isAlreadyScheduled ? 'Scheduled ✓' : 'Schedule'"
          :severity="isAlreadyScheduled ? 'primary' : 'secondary'"
          :disabled="isAtScheduleLimit"
          @click="openScheduleModal"
        />
      </span>
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
                <i v-if="data.id === runs[0]?.id && regressionMap.has('performance')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ data.scores.performance ?? '—' }}
              </span>
            </template>
          </Column>

          <Column header="Accessibility" style="width: 9rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', badgeClass(data.scores.accessibility)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('accessibility')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ data.scores.accessibility ?? '—' }}
              </span>
            </template>
          </Column>

          <Column header="Best Practices" style="width: 9rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', badgeClass(data.scores.best_practices)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('best_practices')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ data.scores.best_practices ?? '—' }}
              </span>
            </template>
          </Column>

          <Column header="SEO" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', badgeClass(data.scores.seo)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('seo')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ data.scores.seo ?? '—' }}
              </span>
            </template>
          </Column>

          <Column header="FCP" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('fcp', data.scores.fcp)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('fcp')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ formatMs(data.scores.fcp) }}
              </span>
            </template>
          </Column>

          <Column header="LCP" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('lcp', data.scores.lcp)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('lcp')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ formatMs(data.scores.lcp) }}
              </span>
            </template>
          </Column>

          <Column header="SI" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('si', data.scores.si)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('si')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ formatMs(data.scores.si) }}
              </span>
            </template>
          </Column>

          <Column header="CLS" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('cls', data.scores.cls)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('cls')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ formatCls(data.scores.cls) }}
              </span>
            </template>
          </Column>

          <Column header="TBT" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('tbt', data.scores.tbt)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('tbt')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
                {{ formatTbt(data.scores.tbt) }}
              </span>
            </template>
          </Column>

          <Column header="TTI" style="width: 6rem">
            <template #body="{ data }">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums', cwvBadgeClass('tti', data.scores.tti)]">
                <i v-if="data.id === runs[0]?.id && regressionMap.has('tti')" class="pi pi-exclamation-triangle text-xs text-amber-500 mr-1" />
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

      <!-- ── Alert thresholds ─────────────────────────────────────────────── -->
      <div
        v-if="showAlerts"
        :class="['mt-8 rounded-lg border p-5', isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']"
      >
        <h3 :class="['text-base font-semibold mb-1', isDarkMode ? 'text-white' : 'text-gray-900']">
          Alert thresholds
        </h3>
        <p :class="['text-xs mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          Email alerts fire when a scheduled audit breaches a threshold.
        </p>

        <!-- Inline notice: no schedule active for this URL -->
        <div
          v-if="!isAlreadyScheduled"
          :class="['flex items-start gap-2 text-sm mb-4 p-3 rounded-lg', isDarkMode ? 'bg-amber-900/40 text-amber-300 border border-amber-700' : 'bg-amber-50 text-amber-800 border border-amber-200']"
        >
          <i class="pi pi-info-circle mt-0.5 shrink-0" />
          <span>Alerts only fire for scheduled audits. Enable a schedule above to receive alerts.</span>
        </div>

        <!-- Loading -->
        <div v-if="alertsLoading" :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          Loading alerts…
        </div>

        <!-- Error -->
        <div
          v-else-if="alertsError"
          :class="['text-sm p-3 rounded-lg', isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800']"
        >
          {{ alertsError }}
        </div>

        <template v-else>
          <!-- Existing alert config rows -->
          <div class="space-y-2 mb-4">
            <div
              v-for="config in alertConfigs"
              :key="config.id"
              :class="['flex flex-wrap items-center gap-2 rounded-lg px-3 py-2', isDarkMode ? 'bg-gray-700' : 'bg-gray-50']"
            >
              <!-- Metric label -->
              <span
                :class="['text-sm font-medium w-32 shrink-0', isDarkMode ? 'text-gray-200' : 'text-gray-700']"
              >
                {{ ALERT_METRICS.find(m => m.value === config.metric)?.label ?? config.metric }}
              </span>

              <!-- Comparison -->
              <select
                v-if="alertEdits[config.id]"
                v-model="alertEdits[config.id].comparison"
                :class="['text-sm rounded border px-2 py-1', isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700']"
              >
                <option value="below">drops below</option>
                <option value="above">rises above</option>
              </select>

              <!-- Threshold -->
              <input
                v-if="alertEdits[config.id]"
                v-model="alertEdits[config.id].threshold"
                type="number"
                min="0"
                step="any"
                :class="['text-sm rounded border px-2 py-1 w-24', isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700']"
              />

              <!-- Enabled toggle -->
              <Button
                v-if="alertEdits[config.id]"
                :label="alertEdits[config.id].enabled ? 'Enabled' : 'Disabled'"
                :severity="alertEdits[config.id].enabled ? 'primary' : 'secondary'"
                size="small"
                text
                @click="alertEdits[config.id].enabled = !alertEdits[config.id].enabled"
              />

              <div class="flex gap-1 ml-auto">
                <Button
                  label="Save"
                  size="small"
                  :loading="alertEdits[config.id]?.saving"
                  :disabled="alertEdits[config.id]?.saving"
                  @click="handleSaveAlert(config.id)"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  text
                  aria-label="Delete alert"
                  @click="handleDeleteAlert(config.id)"
                />
              </div>

              <!-- Per-row error -->
              <p
                v-if="alertEdits[config.id]?.error"
                :class="['w-full text-xs', isDarkMode ? 'text-red-400' : 'text-red-600']"
              >
                {{ alertEdits[config.id].error }}
              </p>
            </div>

            <p
              v-if="alertConfigs.length === 0"
              :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
            >
              No alerts configured yet.
            </p>
          </div>

          <!-- Add new alert -->
          <div
            v-if="availableMetrics.length > 0"
            :class="['flex flex-wrap items-center gap-2 pt-3 border-t', isDarkMode ? 'border-gray-700' : 'border-gray-200']"
          >
            <select
              v-model="newAlert.metric"
              :class="['text-sm rounded border px-2 py-1', isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700']"
              @change="onNewAlertMetricChange"
            >
              <option value="">Metric…</option>
              <option v-for="m in availableMetrics" :key="m.value" :value="m.value">
                {{ m.label }}
              </option>
            </select>

            <select
              v-model="newAlert.comparison"
              :class="['text-sm rounded border px-2 py-1', isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700']"
            >
              <option value="below">drops below</option>
              <option value="above">rises above</option>
            </select>

            <input
              v-model="newAlert.threshold"
              type="number"
              min="0"
              step="any"
              placeholder="Threshold"
              :class="['text-sm rounded border px-2 py-1 w-28', isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-700']"
            />

            <Button
              label="Add alert"
              size="small"
              :disabled="!newAlert.metric || newAlert.threshold === '' || newAlert.submitting"
              :loading="newAlert.submitting"
              @click="handleAddAlert"
            />

            <p
              v-if="newAlert.error"
              :class="['w-full text-xs', isDarkMode ? 'text-red-400' : 'text-red-600']"
            >
              {{ newAlert.error }}
            </p>
          </div>

          <p
            v-else-if="alertConfigs.length > 0"
            :class="['text-xs mt-3', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
          >
            All metrics are configured.
          </p>
        </template>
      </div>
    </template>

    <!-- Schedule modal -->
    <div
      v-if="showScheduleModal"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      @click.self="closeScheduleModal"
    >
      <div
        :class="['rounded-lg p-6 border w-full max-w-md mx-4', isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0 pr-4">
            <h2 :class="['text-lg font-semibold', isDarkMode ? 'text-white' : 'text-gray-900']">
              Schedule audits for
            </h2>
            <span
              class="font-mono text-xs block mt-1 truncate"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
            >
              {{ currentFilterUrl }}
            </span>
          </div>
          <Button icon="pi pi-times" text severity="secondary" aria-label="Close" @click="closeScheduleModal" />
        </div>

        <p
          v-if="filteredUrlTarget"
          :class="['text-sm mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
        >
          Currently: <strong>{{ cronToLabel(filteredUrlTarget.schedule) }}</strong>
        </p>

        <div class="flex gap-2 mb-5">
          <Button
            label="Daily"
            :severity="selectedSchedule === '0 9 * * *' ? 'primary' : 'secondary'"
            @click="selectedSchedule = '0 9 * * *'"
          />
          <Button
            label="Weekly"
            :severity="selectedSchedule === '0 9 * * 1' ? 'primary' : 'secondary'"
            @click="selectedSchedule = '0 9 * * 1'"
          />
          <Button
            label="Monthly"
            :severity="selectedSchedule === '0 9 1 * *' ? 'primary' : 'secondary'"
            @click="selectedSchedule = '0 9 1 * *'"
          />
        </div>

        <div
          v-if="scheduleModalError"
          :class="['text-sm mb-4 p-3 rounded-lg', isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800']"
        >
          {{ scheduleModalError }}
        </div>
        <div
          v-if="scheduleModalSuccess"
          :class="['text-sm mb-4 p-3 rounded-lg', isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800']"
        >
          Scheduled successfully!
        </div>
        <div
          v-if="comingSoonVisible"
          :class="['text-sm mb-4 p-3 rounded-lg', isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800']"
        >
          Remove schedule — coming soon!
        </div>

        <div class="flex items-center gap-2">
          <Button
            v-if="isAlreadyScheduled"
            label="Remove schedule"
            severity="danger"
            text
            @click="removeSchedule"
          />
          <div class="flex gap-2 ml-auto">
            <Button label="Cancel" severity="secondary" @click="closeScheduleModal" />
            <Button
              label="Save schedule"
              :disabled="!selectedSchedule || scheduleSubmitting"
              :loading="scheduleSubmitting"
              @click="submitSchedule"
            />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
