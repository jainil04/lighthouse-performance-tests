<template>
  <div class="space-y-4">
    <Accordion :activeIndex="[0, 1, 2]" multiple>
      <!-- Core Web Vitals -->
      <AccordionTab>
        <template #header="{ active }">
          <div class="flex items-center justify-between w-full">
            <span class="flex items-center gap-2">
              <i class="pi pi-chart-line"></i>
              Core Web Vitals
            </span>
            <i v-if="active" class="pi pi-chevron-down"></i>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <MetricCard
            title="First Contentful Paint"
            :value="formatTime(metrics.firstContentfulPaint)"
            description="Time until first content appears"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Largest Contentful Paint"
            :value="formatTime(metrics.largestContentfulPaint)"
            description="Time until largest content appears"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Cumulative Layout Shift"
            :value="formatCLS(metrics.cumulativeLayoutShift)"
            description="Visual stability measure"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Total Blocking Time"
            :value="formatTime(metrics.totalBlockingTime)"
            description="Time main thread was blocked"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Speed Index"
            :value="formatTime(metrics.speedIndex)"
            description="How quickly content appears"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Time to Interactive"
            :value="formatTime(metrics.timeToInteractive)"
            description="Time until fully interactive"
            :isDarkMode="isDarkMode"
          />
        </div>
      </AccordionTab>

      <!-- Performance Metrics -->
      <AccordionTab>
        <template #header="{ active }">
          <div class="flex items-center justify-between w-full">
            <span class="flex items-center gap-2">
              <i class="pi pi-stopwatch"></i>
              Performance Metrics
            </span>
            <i v-if="active" class="pi pi-chevron-down"></i>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <MetricCard
            title="First Meaningful Paint"
            :value="formatTime(metrics.firstMeaningfulPaint)"
            description="Time until meaningful content appears"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Max Potential FID"
            :value="formatTime(metrics.maxPotentialFirstInputDelay)"
            description="Maximum potential first input delay"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Server Response Time"
            :value="formatTime(metrics.serverResponseTime)"
            description="Time for server to respond"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Main Thread Work"
            :value="formatTime(metrics.mainThreadWork)"
            description="Time spent on main thread work"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Bootup Time"
            :value="formatTime(metrics.bootupTime)"
            description="JavaScript execution time"
            :isDarkMode="isDarkMode"
          />
        </div>
      </AccordionTab>

      <!-- Resource Metrics -->
      <AccordionTab>
        <template #header="{ active }">
          <div class="flex items-center justify-between w-full">
            <span class="flex items-center gap-2">
              <i class="pi pi-database"></i>
              Resource Metrics
            </span>
            <i v-if="active" class="pi pi-chevron-down"></i>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <MetricCard
            title="Total Byte Weight"
            :value="formatBytes(metrics.totalByteWeight)"
            description="Total network transfer size"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Unused JavaScript"
            :value="formatBytes(metrics.unusedJavascript)"
            description="Potential savings from unused JS"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Unused CSS Rules"
            :value="formatBytes(metrics.unusedCssRules)"
            description="Potential savings from unused CSS"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Unoptimized Images"
            :value="formatBytes(metrics.unoptimizedImages)"
            description="Potential savings from image optimization"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Modern Image Formats"
            :value="formatBytes(metrics.modernImageFormats)"
            description="Potential savings from modern formats"
            :isDarkMode="isDarkMode"
          />
          <MetricCard
            title="Render Blocking Resources"
            :value="formatBytes(metrics.renderBlockingResources)"
            description="Potential savings from eliminating render blocking"
            :isDarkMode="isDarkMode"
          />
        </div>
      </AccordionTab>

      <!-- Opportunities (if available) -->
      <AccordionTab
        v-if="opportunities && Object.keys(opportunities).length > 0"
      >
        <template #header="{ active }">
          <div class="flex items-center justify-between w-full">
            <span class="flex items-center gap-2">
              <i class="pi pi-lightbulb"></i>
              Optimization Opportunities
            </span>
            <i v-if="active" class="pi pi-chevron-down"></i>
          </div>
        </template>
        <div class="space-y-3 mt-4">
          <OpportunityCard
            v-for="(opportunity, key) in opportunities"
            :key="key"
            :title="opportunity.title"
            :description="opportunity.description"
            :savingsMs="opportunity.savingsMs"
            :savingsBytes="opportunity.savingsBytes"
            :score="opportunity.score"
            :isDarkMode="isDarkMode"
          />
        </div>
      </AccordionTab>

      <!-- Diagnostics (if available) -->
      <AccordionTab
        v-if="diagnostics && Object.keys(diagnostics).length > 0"
      >
        <template #header="{ active }">
          <div class="flex items-center justify-between w-full">
            <span class="flex items-center gap-2">
              <i class="pi pi-wrench"></i>
              Diagnostics
            </span>
            <i v-if="active" class="pi pi-chevron-down"></i>
          </div>
        </template>
        <div class="space-y-2 mt-4">
          <DiagnosticCard
            v-for="(diagnostic, key) in diagnostics"
            :key="key"
            :title="diagnostic.title"
            :description="diagnostic.description"
            :displayValue="diagnostic.displayValue"
            :score="diagnostic.score"
            :isDarkMode="isDarkMode"
          />
        </div>
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script setup>
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import MetricCard from './MetricCard.vue'
import OpportunityCard from './OpportunityCard.vue'
import DiagnosticCard from './DiagnosticCard.vue'

defineProps({
  metrics: {
    type: Object,
    default: () => ({})
  },
  opportunities: {
    type: Object,
    default: () => ({})
  },
  diagnostics: {
    type: Object,
    default: () => ({})
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

// Helper functions for formatting
const formatTime = (ms) => {
  if (!ms || ms === 0) return '0ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`
}

const formatCLS = (cls) => {
  if (!cls || cls === 0) return '0'
  return cls.toFixed(3)
}
</script>
