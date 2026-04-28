<template>
  <div class="min-h-screen p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header Section -->
      <div class="mb-8">
        <h1 :class="['text-3xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-gray-900']">
          Compare Results
        </h1>
        <p :class="['text-lg', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
          Compare saved audit runs or upload CSV files from Lighthouse
        </p>
      </div>

      <!-- Compare Saved Runs Section -->
      <div class="mb-8">
        <div :class="['rounded-lg border p-6', isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
          <h2 :class="['text-xl font-semibold mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
            Compare Saved Runs
          </h2>

          <!-- Not logged in -->
          <div v-if="!user" :class="['flex items-center gap-3 p-4 rounded-lg', isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
            <i class="pi pi-lock" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"></i>
            <span :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
              <RouterLink
                to="/auth"
                :class="['font-medium underline underline-offset-2', isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700']"
              >Sign in</RouterLink>
              to compare your saved audit results
            </span>
          </div>

          <!-- Loading -->
          <div v-else-if="historyLoading" class="space-y-2">
            <div v-for="i in 3" :key="i" :class="['h-14 rounded-lg animate-pulse', isDarkMode ? 'bg-gray-700' : 'bg-gray-100']"></div>
          </div>

          <!-- Empty state -->
          <div v-else-if="historyRuns.length === 0" class="py-6 text-center">
            <i :class="['pi pi-history text-4xl mb-3 block', isDarkMode ? 'text-gray-600' : 'text-gray-300']"></i>
            <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              No saved runs yet. Run an audit on the home page to get started.
            </p>
          </div>

          <!-- Run list -->
          <div v-else>
            <p :class="['text-sm mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Select 2 or more runs to compare
            </p>
            <div class="space-y-2">
              <div
                v-for="run in historyRuns"
                :key="run.id"
                @click="toggleRun(run.id)"
                :class="[
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all duration-150',
                  selectedRunIds.has(run.id)
                    ? isDarkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                    : isDarkMode ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/40' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                ]"
              >
                <!-- Custom checkbox -->
                <div :class="[
                  'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                  selectedRunIds.has(run.id) ? 'bg-blue-500 border-blue-500' : isDarkMode ? 'border-gray-500' : 'border-gray-400'
                ]">
                  <svg v-if="selectedRunIds.has(run.id)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>

                <!-- Run info -->
                <div class="flex-1 min-w-0">
                  <p :class="['text-sm font-medium truncate', isDarkMode ? 'text-gray-200' : 'text-gray-800']">{{ run.url }}</p>
                  <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    {{ formatDate(run.created_at) }} · {{ run.device }}
                  </p>
                </div>

                <!-- Score badges -->
                <div class="hidden sm:flex items-center gap-1 flex-shrink-0">
                  <span :class="['text-xs px-1.5 py-0.5 rounded font-medium', scoreBadgeClass(run.scores.performance)]">P {{ run.scores.performance ?? '—' }}</span>
                  <span :class="['text-xs px-1.5 py-0.5 rounded font-medium', scoreBadgeClass(run.scores.accessibility)]">A {{ run.scores.accessibility ?? '—' }}</span>
                  <span :class="['text-xs px-1.5 py-0.5 rounded font-medium', scoreBadgeClass(run.scores.best_practices)]">BP {{ run.scores.best_practices ?? '—' }}</span>
                  <span :class="['text-xs px-1.5 py-0.5 rounded font-medium', scoreBadgeClass(run.scores.seo)]">SEO {{ run.scores.seo ?? '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Action row -->
            <div class="flex items-center gap-3 mt-4">
              <Button
                label="Compare"
                icon="pi pi-chart-bar"
                :disabled="!canCompare"
                size="small"
                @click="confirmHistoryComparison"
              />
              <Button
                v-if="comparisonRuns.length > 0"
                label="Clear"
                severity="secondary"
                outlined
                size="small"
                @click="clearHistoryComparison"
              />
              <span :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ selectedRunIds.size }} of {{ historyRuns.length }} selected
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- History Comparison Results -->
      <template v-if="comparisonRuns.length >= 2">
        <AiSummary
          :scores="{}"
          :all-runs-data="comparisonRuns"
          :opportunities="{}"
          :compare-tables="true"
          :is-dark-mode="isDarkMode"
          :user="user"
          :token="token"
        />

        <!-- Per-run summary cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div
            v-for="run in comparisonRuns"
            :key="`comp-${run.url}-${run.date}`"
            :class="['rounded-lg border p-4', isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']"
          >
            <p :class="['text-sm font-semibold truncate mb-0.5', isDarkMode ? 'text-gray-100' : 'text-gray-900']">{{ run.url }}</p>
            <p :class="['text-xs mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ run.date }} · {{ run.device }}</p>

            <!-- Category scores -->
            <div class="flex flex-wrap gap-1.5 mb-3">
              <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', scoreBadgeClass(run.performance)]">Perf {{ run.performance ?? '—' }}</span>
              <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', scoreBadgeClass(run.accessibility)]">A11y {{ run.accessibility ?? '—' }}</span>
              <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', scoreBadgeClass(run.best_practices)]">BP {{ run.best_practices ?? '—' }}</span>
              <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', scoreBadgeClass(run.seo)]">SEO {{ run.seo ?? '—' }}</span>
            </div>

            <!-- CWV metrics -->
            <div class="grid grid-cols-3 gap-1.5 text-xs">
              <div :class="['p-1.5 rounded text-center', isDarkMode ? 'bg-gray-700' : 'bg-gray-50']">
                <div :class="['font-medium', isDarkMode ? 'text-gray-100' : 'text-gray-800']">{{ formatMs(run.fcp_ms) }}</div>
                <div :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">FCP</div>
              </div>
              <div :class="['p-1.5 rounded text-center', isDarkMode ? 'bg-gray-700' : 'bg-gray-50']">
                <div :class="['font-medium', isDarkMode ? 'text-gray-100' : 'text-gray-800']">{{ formatMs(run.lcp_ms) }}</div>
                <div :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">LCP</div>
              </div>
              <div :class="['p-1.5 rounded text-center', isDarkMode ? 'bg-gray-700' : 'bg-gray-50']">
                <div :class="['font-medium', isDarkMode ? 'text-gray-100' : 'text-gray-800']">{{ formatMs(run.si_ms) }}</div>
                <div :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">SI</div>
              </div>
              <div :class="['p-1.5 rounded text-center', isDarkMode ? 'bg-gray-700' : 'bg-gray-50']">
                <div :class="['font-medium', isDarkMode ? 'text-gray-100' : 'text-gray-800']">{{ run.cls ?? '—' }}</div>
                <div :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">CLS</div>
              </div>
              <div :class="['p-1.5 rounded text-center', isDarkMode ? 'bg-gray-700' : 'bg-gray-50']">
                <div :class="['font-medium', isDarkMode ? 'text-gray-100' : 'text-gray-800']">{{ formatMs(run.tbt_ms) }}</div>
                <div :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">TBT</div>
              </div>
              <div :class="['p-1.5 rounded text-center', isDarkMode ? 'bg-gray-700' : 'bg-gray-50']">
                <div :class="['font-medium', isDarkMode ? 'text-gray-100' : 'text-gray-800']">{{ formatMs(run.tti_ms) }}</div>
                <div :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">TTI</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Divider -->
      <div :class="['h-px w-full mb-8', isDarkMode ? 'bg-gray-700' : 'bg-gray-200']"></div>

      <!-- CSV Upload Section -->
      <div class="mb-8">
        <div :class="['rounded-lg border p-6', isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
          <h2 :class="['text-xl font-semibold mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
            Compare from CSV Files
          </h2>
          <p :class="['text-sm mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            Upload CSV exports from Lighthouse to compare results
          </p>
          <FileUploadComponent
            :is-dark-mode="isDarkMode"
            @file-upload="handleFileUpload"
          />
        </div>
      </div>

      <!-- CSV AiSummary -->
      <AiSummary
        v-if="uploadedFiles.length > 1"
        :scores="{}"
        :all-runs-data="uploadedFiles"
        :opportunities="{}"
        :compare-tables="true"
        :is-dark-mode="isDarkMode"
        :user="user"
        :token="token"
      />

      <!-- CSV Tables -->
      <div v-if="uploadedFiles.length > 0" class="space-y-8">
        <div
          v-for="(fileData, index) in uploadedFiles"
          :key="`file-${index}`"
          :class="['rounded-lg border p-6', isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']"
        >
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 :class="['text-lg font-semibold mb-2', isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ fileData.fileName }}
              </h3>
              <div class="flex flex-wrap gap-4 text-sm">
                <div v-if="fileData.metadata.Device" class="flex items-center gap-1">
                  <i class="pi pi-desktop" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" />
                  <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Device:</span>
                  <span :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'">{{ fileData.metadata.Device }}</span>
                </div>
                <div v-if="fileData.metadata.Throttling" class="flex items-center gap-1">
                  <i class="pi pi-wifi" :class="isDarkMode ? 'text-green-400' : 'text-green-600'" />
                  <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Throttling:</span>
                  <span :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'">{{ fileData.metadata.Throttling }}</span>
                </div>
                <div v-if="fileData.metadata.URL" class="flex items-center gap-1">
                  <i class="pi pi-link" :class="isDarkMode ? 'text-purple-400' : 'text-purple-600'" />
                  <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">URL:</span>
                  <span :class="['truncate max-w-md', isDarkMode ? 'text-gray-200' : 'text-gray-900']" :title="fileData.metadata.URL">{{ fileData.metadata.URL }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge :value="`${fileData.data.length} rows`" severity="info" />
              <Button
                icon="pi pi-times"
                @click="removeFile(index)"
                outlined
                rounded
                severity="danger"
                size="small"
              />
            </div>
          </div>

          <DataTableComponent
            :data="fileData.data"
            :headers="fileData.headers"
            :is-dark-mode="isDarkMode"
          />
        </div>
      </div>

      <!-- CSV Empty State -->
      <div v-else-if="comparisonRuns.length === 0" class="text-center py-12">
        <i :class="['pi pi-upload text-6xl mb-4', isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
        <h3 :class="['text-xl font-semibold mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
          No files uploaded yet
        </h3>
        <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          Upload CSV files to view and compare their contents
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted } from 'vue'
import FileUploadComponent from '../components/ui/forms/FileUploadComponent.vue'
import DataTableComponent from '../components/ui/common/DataTableComponent.vue'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import AiSummary from '../components/ui/common/AiSummary.vue'

const isDarkMode = inject('isDarkMode', ref(false))
const user = inject('user')
const token = inject('token')

// CSV upload state
const uploadedFiles = ref([])

// History comparison state
const historyRuns = ref([])
const historyLoading = ref(false)
const selectedRunIds = ref(new Set())
const comparisonRuns = ref([])

const selectedRuns = computed(() => historyRuns.value.filter(r => selectedRunIds.value.has(r.id)))
const canCompare = computed(() => selectedRunIds.value.size >= 2)

function toggleRun(id) {
  const s = new Set(selectedRunIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedRunIds.value = s
}

function confirmHistoryComparison() {
  comparisonRuns.value = selectedRuns.value.map(transformRun)
}

function clearHistoryComparison() {
  comparisonRuns.value = []
  selectedRunIds.value = new Set()
}

function transformRun(run) {
  return {
    url: run.url,
    device: run.device,
    date: formatDate(run.created_at),
    performance: run.scores.performance,
    accessibility: run.scores.accessibility,
    best_practices: run.scores.best_practices,
    seo: run.scores.seo,
    fcp_ms: run.scores.fcp,
    lcp_ms: run.scores.lcp,
    si_ms: run.scores.si,
    cls: run.scores.cls,
    tbt_ms: run.scores.tbt,
    tti_ms: run.scores.tti,
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMs(ms) {
  if (ms === null || ms === undefined) return '—'
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

function scoreBadgeClass(score) {
  if (score === null || score === undefined) return isDarkMode.value ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
  if (score >= 90) return isDarkMode.value ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
  if (score >= 50) return isDarkMode.value ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
  return isDarkMode.value ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
}

async function fetchHistory() {
  if (!token.value) return
  historyLoading.value = true
  try {
    const res = await fetch('/api/history?limit=10', {
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
    if (res.ok) {
      const data = await res.json()
      historyRuns.value = data.runs
    }
  } catch (e) {
    console.error('Failed to fetch history', e)
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  if (user.value) fetchHistory()
})

// CSV upload logic
const handleFileUpload = async (event) => {
  if (event.type === 'selected') {
    for (const file of event.files) {
      try {
        const content = await readFileContent(file)
        const parsedData = parseCSV(content)
        uploadedFiles.value.push({
          fileName: file.name,
          fileSize: file.size,
          data: parsedData.data,
          headers: parsedData.headers,
          metadata: parsedData.metadata
        })
      } catch (error) {
        console.error('Error reading file:', error)
      }
    }
  }
}

const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

const parseCSV = (content) => {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], data: [], metadata: {} }

  const allHeaders = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))
  const metadataColumns = ['Device', 'URL', 'Throttling']
  const tableHeaders = allHeaders.filter(col => !metadataColumns.includes(col))

  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim().replace(/"/g, ''))
    const row = {}
    allHeaders.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  })

  const metadata = {}
  if (data.length > 0) {
    metadataColumns.forEach(col => {
      if (allHeaders.includes(col)) {
        metadata[col] = data[0][col]
      }
    })
  }

  const cleanedData = data.map(row => {
    const cleanRow = { ...row }
    metadataColumns.forEach(col => { delete cleanRow[col] })
    return cleanRow
  })

  return { headers: tableHeaders, data: cleanedData, metadata }
}

const removeFile = (index) => {
  uploadedFiles.value.splice(index, 1)
}
</script>
