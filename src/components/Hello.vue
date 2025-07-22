<template>
  <div>
    <!-- Existing buttons -->
    <Button
        @click="loadProducts"
        :icon="loading ? 'pi pi-spin pi-spinner' : 'pi pi-send'"
        severity="primary"
        rounded
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />

    <Button
        @click="checkHealth"
        :icon="healthLoading ? 'pi pi-spin pi-spinner' : 'pi pi-heart'"
        severity="success"
        rounded
        style="margin-left: 10px"
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />

    <Button
        @click="checkStatus"
        :icon="statusLoading ? 'pi pi-spin pi-spinner' : 'pi pi-info-circle'"
        severity="info"
        rounded
        style="margin-left: 10px"
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />

    <Button
        @click="checkDebug"
        :icon="debugLoading ? 'pi pi-spin pi-spinner' : 'pi pi-cog'"
        severity="warning"
        rounded
        style="margin-left: 10px"
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />

    <!-- New Chrome test button -->
    <Button
        @click="testChrome"
        :icon="chromeLoading ? 'pi pi-spin pi-spinner' : 'pi pi-desktop'"
        severity="contrast"
        rounded
        style="margin-left: 10px"
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />
      <!-- New audit test button -->
    <Button
        @click="runAudit"
        :icon="auditLoading ? 'pi pi-spin pi-spinner' : 'pi pi-chart-line'"
        severity="secondary"
        rounded
        style="margin-left: 10px"
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />

      <!-- New streaming lighthouse test button -->
    <Button
        @click="runStreamingAudit"
        :icon="streamingLoading ? 'pi pi-spin pi-spinner' : 'pi pi-play'"
        severity="help"
        rounded
        style="margin-left: 10px"
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />

    <!-- Display results -->
    <ul v-if="products.length">
      <li v-for="p in products" :key="p.id">{{ p.name }}</li>
    </ul>

    <div v-if="healthData" style="margin-top: 20px; padding: 10px; background: #f0f9ff; border-radius: 4px; color: #1e40af;">
      <h4 style="color: #1e40af; margin-bottom: 10px;">Health Check Result:</h4>
      <pre style="color: #374151; background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(healthData, null, 2) }}</pre>
    </div>

    <div v-if="statusData" style="margin-top: 20px; padding: 10px; background: #fff7ed; border-radius: 4px; color: #c2410c;">
      <h4 style="color: #c2410c; margin-bottom: 10px;">Status Check Result:</h4>
      <pre style="color: #374151; background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(statusData, null, 2) }}</pre>
    </div>

    <div v-if="debugData" style="margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 4px; color: #d97706;">
      <h4 style="color: #d97706; margin-bottom: 10px;">Debug Check Result:</h4>
      <pre style="color: #374151; background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(debugData, null, 2) }}</pre>
    </div>

    <div v-if="chromeData" style="margin-top: 20px; padding: 10px; background: #f3f4f6; border-radius: 4px; color: #374151;">
      <h4 style="color: #374151; margin-bottom: 10px;">Chrome Test Result:</h4>
      <pre style="color: #374151; background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(chromeData, null, 2) }}</pre>
    </div>
  </div>
  <!-- Add this to your results section -->
    <div v-if="auditData" style="margin-top: 20px; padding: 10px; background: #ecfdf5; border-radius: 4px; color: #065f46;">
      <h4 style="color: #065f46; margin-bottom: 10px;">Lighthouse Audit Result:</h4>
      <div v-if="auditData.success" style="margin-bottom: 10px; color: #065f46;">
        <strong>URL:</strong> {{ auditData.url }}<br>
        <strong>Scores:</strong>
        Performance: {{ auditData.scores?.performance }},
        Accessibility: {{ auditData.scores?.accessibility }},
        Best Practices: {{ auditData.scores?.bestPractices }},
        SEO: {{ auditData.scores?.seo }}
      </div>
      <pre style="color: #374151; background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(auditData, null, 2) }}</pre>
    </div>
    <div v-if="streamingData" style="margin-top: 20px; padding: 10px; background: #fdf4ff; border-radius: 4px; color: #7c2d92;">
      <h4 style="color: #7c2d92; margin-bottom: 10px;">Streaming Lighthouse Audit:</h4>
      <div v-if="streamingProgress" style="margin-bottom: 10px; color: #7c2d92;">
        <strong>Progress:</strong> {{ streamingProgress.message }} ({{ streamingProgress.progress }}%)
      </div>
      <div v-if="streamingData.success" style="margin-bottom: 10px; color: #7c2d92;">
        <strong>URL:</strong> {{ streamingData.url }}<br>
        <strong>Scores:</strong>
        Performance: {{ streamingData.scores?.performance }},
        Accessibility: {{ streamingData.scores?.accessibility }},
        Best Practices: {{ streamingData.scores?.bestPractices }},
        SEO: {{ streamingData.scores?.seo }}
      </div>
      <pre style="color: #374151; background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(streamingData, null, 2) }}</pre>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'

const products = ref([])
const loading = ref(false)
const healthData = ref(null)
const healthLoading = ref(false)
const statusData = ref(null)
const statusLoading = ref(false)
const debugData = ref(null)
const debugLoading = ref(false)
const chromeData = ref(null)
const chromeLoading = ref(false)
const auditData = ref(null)
const auditLoading = ref(false)
const streamingData = ref(null)
const streamingLoading = ref(false)
const streamingProgress = ref(null)

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
});

async function loadProducts() {
  loading.value = true
  try {
    const res = await fetch('/api/hello')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    products.value = await res.json()
  } catch (err) {
    console.error('Failed to load products:', err)
  } finally {
    loading.value = false
  }
}

async function checkHealth() {
  healthLoading.value = true
  try {
    const res = await fetch('/api/health')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    healthData.value = await res.json()
  } catch (err) {
    console.error('Health check failed:', err)
    healthData.value = { error: err.message }
  } finally {
    healthLoading.value = false
  }
}

async function checkStatus() {
  statusLoading.value = true
  try {
    const res = await fetch('/api/status')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    statusData.value = await res.json()
  } catch (err) {
    console.error('Status check failed:', err)
    statusData.value = { error: err.message }
  } finally {
    statusLoading.value = false
  }
}

async function checkDebug() {
  debugLoading.value = true
  try {
    const res = await fetch('/api/debug')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    debugData.value = await res.json()
  } catch (err) {
    console.error('Debug check failed:', err)
    debugData.value = { error: err.message }
  } finally {
    debugLoading.value = false
  }
}

async function testChrome() {
  chromeLoading.value = true
  try {
    const res = await fetch('/api/test-chrome')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    chromeData.value = await res.json()
  } catch (err) {
    console.error('Chrome test failed:', err)
    chromeData.value = { error: err.message }
  } finally {
    chromeLoading.value = false
  }
}

async function runAudit() {
  auditLoading.value = true
  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://example.com',
        device: 'desktop',
        throttle: 'none'
      })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    auditData.value = await res.json()
  } catch (err) {
    console.error('Audit failed:', err)
    auditData.value = { error: err.message }
  } finally {
    auditLoading.value = false
  }
}

async function runStreamingAudit() {
  streamingLoading.value = true
  streamingData.value = null
  streamingProgress.value = null

  try {
    const response = await fetch('/api/lighthouse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://example.com',
        device: 'desktop',
        throttle: 'none',
        runs: 1,
        auditView: 'standard'
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'progress') {
              streamingProgress.value = data
            } else if (data.type === 'complete') {
              streamingData.value = data.result
              streamingProgress.value = { message: 'Complete!', progress: 100 }
            } else if (data.type === 'error') {
              streamingData.value = { error: data.error }
              break
            }
          } catch (parseError) {
            console.error('Error parsing streaming data:', parseError)
          }
        }
      }
    }
  } catch (err) {
    console.error('Streaming audit failed:', err)
    streamingData.value = { error: err.message }
  } finally {
    streamingLoading.value = false
  }
}
</script>
