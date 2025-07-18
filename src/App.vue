<script setup>
import { ref, provide, onMounted } from 'vue'
import AppLayout from './components/layout/AppLayout.vue'

// Dark mode state - provide to all children
const isDarkMode = ref(false)

// Sidebar selection state
const currentRuns = ref(1)
const currentDevice = ref('desktop')
const currentThrottle = ref('none')
const currentAuditView = ref('standard')

// Clean up any existing theme classes on mount
onMounted(() => {
  // Remove any existing theme classes that might be causing conflicts
  document.documentElement.classList.remove('my-app-dark', 'dark')
})

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
}

// Provide dark mode to all components
provide('isDarkMode', isDarkMode)
provide('toggleDarkMode', toggleDarkMode)
provide('currentRuns', currentRuns)
provide('currentDevice', currentDevice)
provide('currentThrottle', currentThrottle)
provide('currentAuditView', currentAuditView)

// Sidebar selection handlers for AppLayout
const handleDeviceChange = (device) => {
  currentDevice.value = device
  console.log('Device changed to:', device)
}

const handleThrottleChange = (throttle) => {
  currentThrottle.value = throttle
  console.log('Throttle changed to:', throttle)
}

const handleRunsChange = (runs) => {
  currentRuns.value = runs
  console.log('Runs changed to:', runs)
}

const handleAuditViewChange = (view) => {
  currentAuditView.value = view
  console.log('Audit view changed to:', view)
}

const handleThemeChange = (isDark) => {
  isDarkMode.value = isDark
  console.log('Theme changed to:', isDark)

  // Apply theme class to document element for global theme support
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
</script>

<template>
  <div id="app" :class="{ 'dark': isDarkMode }">
    <AppLayout
      :is-dark-mode="isDarkMode"
      :current-runs="currentRuns"
      :current-device="currentDevice"
      :current-throttle="currentThrottle"
      :current-audit-view="currentAuditView"
      @theme-change="handleThemeChange"
      @device-change="handleDeviceChange"
      @throttle-change="handleThrottleChange"
      @runs-change="handleRunsChange"
      @audit-view-change="handleAuditViewChange"
    >
      <RouterView />
    </AppLayout>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  transition: all 0.3s ease;
}

.dark {
  background-color: #1e1e1e;
}
</style>
