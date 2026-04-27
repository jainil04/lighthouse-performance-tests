<template>
  <div>
    <Accordion :activeIndex="[0]" multiple>
      <AccordionTab v-for="(cat, key) in orderedCategories" :key="key">
        <template #header>
          <div class="flex items-center justify-between w-full pr-2">
            <span class="flex items-center gap-2">
              <i :class="[getCategoryIcon(key), isDarkMode ? 'text-gray-300' : 'text-gray-600']"></i>
              <span :class="['font-medium text-sm', isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ cat.title }}
              </span>
            </span>
            <span :class="['text-xs font-bold px-2 py-0.5 rounded-full ml-auto mr-3', getScoreBadgeClass(cat.score)]">
              {{ cat.score !== null && cat.score !== undefined ? Math.round(cat.score * 100) : 'N/A' }}
            </span>
          </div>
        </template>

        <div class="space-y-3 mt-2">
          <template v-for="group in getGroupedAudits(cat)" :key="group.label">
            <template v-if="group.audits.length">
              <!-- Group heading -->
              <div :class="['text-xs font-semibold uppercase tracking-wide px-1 pt-1 pb-0.5 flex items-center gap-1.5', group.headingClass]">
                <span :class="['inline-block w-2 h-2 rounded-full', group.dotClass]"></span>
                {{ group.label }} — {{ group.audits.length }}
              </div>

              <!-- Audit rows -->
              <div
                v-for="audit in group.audits"
                :key="audit.id"
                :class="[
                  'rounded-lg border transition-all duration-200',
                  hasExpandableContent(audit) ? 'cursor-pointer' : '',
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                ]"
                @click="hasExpandableContent(audit) && toggleExpanded(audit.id)"
              >
                <!-- Row main line -->
                <div class="flex items-center gap-3 px-4 py-3">
                  <!-- Score dot -->
                  <span :class="['flex-shrink-0 w-2.5 h-2.5 rounded-full', getAuditDotClass(audit)]"></span>

                  <!-- Title -->
                  <span :class="['flex-1 text-sm font-medium', isDarkMode ? 'text-white' : 'text-gray-900']">
                    {{ audit.title }}
                  </span>

                  <!-- Display value -->
                  <span
                    v-if="audit.displayValue"
                    :class="['text-xs font-medium whitespace-nowrap ml-2', getAuditValueClass(audit)]"
                  >
                    {{ audit.displayValue }}
                  </span>

                  <!-- Savings badge -->
                  <span
                    v-else-if="getSavings(audit)"
                    :class="['text-xs font-medium whitespace-nowrap ml-2', getAuditValueClass(audit)]"
                  >
                    {{ getSavings(audit) }}
                  </span>

                  <!-- Expand chevron -->
                  <i
                    v-if="hasExpandableContent(audit)"
                    :class="[
                      'flex-shrink-0 text-xs transition-transform duration-200',
                      isExpanded(audit.id) ? 'pi pi-chevron-up' : 'pi pi-chevron-down',
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    ]"
                  ></i>
                </div>

                <!-- Expandable section -->
                <div
                  v-show="isExpanded(audit.id)"
                  :class="[
                    'border-t',
                    isDarkMode ? 'border-gray-700' : 'border-gray-100'
                  ]"
                  @click.stop
                >
                  <!-- Description with rendered links -->
                  <p
                    v-if="audit.description"
                    :class="['px-4 pt-3 pb-2 text-xs leading-relaxed', isDarkMode ? 'text-gray-400' : 'text-gray-600']"
                    v-html="renderDescription(audit.description)"
                  ></p>

                  <!-- Details table -->
                  <div v-if="getDetailsTable(audit)" class="px-4 pb-3">
                    <div :class="['rounded-md overflow-hidden border', isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                      <table class="w-full text-xs">
                        <thead>
                          <tr :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-50']">
                            <th
                              v-for="h in getDetailsTable(audit).headings"
                              :key="h.key"
                              :class="[
                                'px-3 py-2 text-left font-semibold',
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              ]"
                            >
                              {{ h.label || h.text }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(item, i) in getDetailsTable(audit).items"
                            :key="i"
                            :class="[
                              'border-t',
                              isDarkMode ? 'border-gray-700 even:bg-gray-750' : 'border-gray-100 even:bg-gray-50'
                            ]"
                          >
                            <td
                              v-for="h in getDetailsTable(audit).headings"
                              :key="h.key"
                              :class="[
                                'px-3 py-2 max-w-xs',
                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              ]"
                            >
                              <a
                                v-if="isUrlCell(item[h.key], h)"
                                :href="getCellUrl(item[h.key])"
                                target="_blank"
                                rel="noopener"
                                :class="['truncate block max-w-xs underline', isDarkMode ? 'text-blue-400' : 'text-blue-600']"
                                :title="getCellUrl(item[h.key])"
                                @click.stop
                              >
                                {{ truncateUrl(getCellUrl(item[h.key])) }}
                              </a>
                              <span v-else class="truncate block">{{ formatCellValue(item[h.key], h) }}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div
                        v-if="getDetailsTable(audit).truncated"
                        :class="['px-3 py-1.5 text-xs border-t', isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-100']"
                      >
                        Showing top {{ getDetailsTable(audit).items.length }} of {{ getDetailsTable(audit).total }} items
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'

const props = defineProps({
  fullReport: {
    type: Object,
    required: true
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const CATEGORY_ORDER = ['performance', 'accessibility', 'best-practices', 'seo']

const CATEGORY_ICONS = {
  'performance': 'pi pi-bolt',
  'accessibility': 'pi pi-eye',
  'best-practices': 'pi pi-shield',
  'seo': 'pi pi-search'
}

const orderedCategories = computed(() => {
  if (!props.fullReport?.categories) return {}
  return CATEGORY_ORDER.reduce((acc, key) => {
    if (props.fullReport.categories[key]) acc[key] = props.fullReport.categories[key]
    return acc
  }, {})
})

const getCategoryIcon = (key) => CATEGORY_ICONS[key] || 'pi pi-list'

const getScoreBadgeClass = (score) => {
  if (score === null || score === undefined) {
    return props.isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
  }
  const pct = Math.round(score * 100)
  if (pct >= 90) return props.isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
  if (pct >= 50) return props.isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
  return props.isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
}

const GROUPS = [
  {
    label: 'Failed',
    dotClass: 'bg-red-500',
    headingClass: computed(() => props.isDarkMode ? 'text-red-400' : 'text-red-600'),
    test: (a) => a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.score !== null && a.score < 0.5
  },
  {
    label: 'Needs Improvement',
    dotClass: 'bg-yellow-500',
    headingClass: computed(() => props.isDarkMode ? 'text-yellow-400' : 'text-yellow-600'),
    test: (a) => a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.score !== null && a.score >= 0.5 && a.score < 0.9
  },
  {
    label: 'Passed',
    dotClass: 'bg-green-500',
    headingClass: computed(() => props.isDarkMode ? 'text-green-400' : 'text-green-600'),
    test: (a) => a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.score !== null && a.score >= 0.9
  },
  {
    label: 'Informational',
    dotClass: 'bg-gray-400',
    headingClass: computed(() => props.isDarkMode ? 'text-gray-400' : 'text-gray-500'),
    test: (a) => a.scoreDisplayMode === 'informative' || a.scoreDisplayMode === 'notApplicable' || a.score === null
  }
]

const getGroupedAudits = (category) => {
  if (!props.fullReport?.audits || !category.auditRefs) return []
  const audits = category.auditRefs
    .map(ref => props.fullReport.audits[ref.id])
    .filter(a => a && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'error')

  return GROUPS.map(g => ({
    label: g.label,
    dotClass: g.dotClass,
    headingClass: g.headingClass.value,
    audits: audits.filter(g.test)
  }))
}

const getAuditDotClass = (audit) => {
  if (audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'notApplicable' || audit.score === null) {
    return props.isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
  }
  if (audit.score >= 0.9) return 'bg-green-500'
  if (audit.score >= 0.5) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getAuditValueClass = (audit) => {
  if (audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'notApplicable' || audit.score === null) {
    return props.isDarkMode ? 'text-gray-400' : 'text-gray-500'
  }
  if (audit.score >= 0.9) return 'text-green-500'
  if (audit.score >= 0.5) return 'text-yellow-500'
  return 'text-red-500'
}

// Render markdown links in description as real <a> tags
const renderDescription = (text) => {
  if (!text) return ''
  return text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener" class="${props.isDarkMode ? 'text-blue-400' : 'text-blue-600'} underline hover:opacity-80">$1</a>`
  )
}

// Extract byte or ms savings from audit details
const getSavings = (audit) => {
  const d = audit.details
  if (!d) return null
  if (d.overallSavingsMs > 0) return `Est savings of ${formatMs(d.overallSavingsMs)}`
  if (d.overallSavingsBytes > 0) return `Est savings of ${formatBytes(d.overallSavingsBytes)}`
  return null
}

const TABLE_TYPES = new Set(['table', 'opportunity'])
const MAX_ROWS = 10

const getDetailsTable = (audit) => {
  const d = audit.details
  if (!d || !TABLE_TYPES.has(d.type)) return null
  const headings = (d.headings || []).filter(h => (h.label || h.text) && h.key)
  if (!headings.length || !d.items?.length) return null
  const total = d.items.length
  const items = d.items.slice(0, MAX_ROWS)
  return { headings, items, total, truncated: total > MAX_ROWS }
}

const hasExpandableContent = (audit) => {
  return !!(audit.description || getDetailsTable(audit))
}

// Cell rendering helpers
const isUrlCell = (value, heading) => {
  if (!value) return false
  const vt = heading.valueType || heading.type
  if (vt === 'url') return true
  if (heading.key === 'url') return true
  if (typeof value === 'object' && value?.type === 'url') return true
  return false
}

const getCellUrl = (value) => {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value?.value) return value.value
  return ''
}

const truncateUrl = (url) => {
  if (!url) return '—'
  try {
    const u = new URL(url)
    const path = u.pathname + u.search
    return path.length > 50 ? u.hostname + path.slice(0, 47) + '…' : u.hostname + path
  } catch {
    return url.length > 60 ? url.slice(0, 57) + '…' : url
  }
}

const formatMs = (ms) => {
  if (!ms && ms !== 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '—'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KiB', 'MiB', 'GiB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

const formatCellValue = (value, heading) => {
  if (value === null || value === undefined) return '—'
  const vt = heading.valueType || heading.type
  if (vt === 'bytes') return formatBytes(value)
  if (vt === 'ms' || vt === 'timespanMs') return formatMs(value)
  if (typeof value === 'object' && value?.type === 'node') return value.nodeLabel || value.snippet || '—'
  if (typeof value === 'object' && value?.type === 'code') return value.value || '—'
  if (typeof value === 'object' && value?.type === 'link') return value.text || value.url || '—'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

// Expand/collapse per audit
const expandedAudits = ref({})

const toggleExpanded = (id) => {
  expandedAudits.value = { ...expandedAudits.value, [id]: !expandedAudits.value[id] }
}

const isExpanded = (id) => !!expandedAudits.value[id]
</script>
