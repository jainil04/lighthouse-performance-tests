<template>
  <div
    class="fixed bottom-0 left-0 w-full z-50 flex items-center justify-center h-12 border-t"
    :class="[
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    ]"
  >
    <div v-if="systemStatus.isLoading" class="text-sm text-gray-500 dark:text-gray-400">
      <i class="pi pi-spin pi-spinner text-xs mr-2"></i>
      Checking system status...
    </div>
    <div v-else-if="systemStatus.allSystemsOk" class="text-sm text-green-600 dark:text-green-400">
      <i class="pi pi-check-circle text-xs mr-2"></i>
      All systems operational
    </div>
    <div v-else class="text-sm text-red-600 dark:text-red-400">
      <i class="pi pi-exclamation-triangle text-xs mr-2"></i>
      System issues detected
      <button
        @click="checkSystemHealth"
        class="ml-2 underline hover:no-underline"
        title="Recheck system status"
      >
        (recheck)
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  isDarkMode: Boolean
})

// System status for footer
const systemStatus = ref({
  health: false,
  status: false,
  audit: false,
  lighthouse: false,
  isLoading: true,
  allSystemsOk: false
})

// System status checking
async function checkSystemHealth() {
  systemStatus.value.isLoading = true

  // Only check lighthouse endpoint; use POST method as in Hello.vue
  const checks = [
    {
      key: 'lighthouse',
      url: '/api/lighthouse',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://www.google.com',
          device: 'desktop',
          throttle: 'none',
          runs: 1,
          auditView: 'standard'
        })
      }
    }
  ]

  try {
    const promises = checks.map(async (check) => {
      try {
        const response = await fetch(check.url, check.options)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        // Handle streaming response
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let success = false
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'complete') {
                  success = data.data.run.scores?.performance >= 0 || data.data.run.metrics?.largestContentfulPaint >= 0
                } else if (data.type === 'error') {
                  success = false
                }
              } catch (parseError) {
                console.error('Error parsing streaming data:', parseError)
              }
            }
          }
        }
        return { key: check.key, success }
      } catch (error) {
        console.warn(`System check failed for ${check.key}:`, error)
        return { key: check.key, success: false }
      }
    })

    const results = await Promise.all(promises)
    results.forEach(result => {
      systemStatus.value[result.key] = result.success
    })

    systemStatus.value.allSystemsOk = results.every(r => r.success)
  } catch (error) {
    console.error('System health check failed:', error)
    systemStatus.value.allSystemsOk = false
  } finally {
    systemStatus.value.isLoading = false
  }
}

// Check system health on component mount
onMounted(() => {
  checkSystemHealth()
})
</script>
