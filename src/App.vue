<script setup>
import { ref, provide, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from './components/layout/AppLayout.vue'

const router = useRouter()

// Dark mode state - provide to all children
const isDarkMode = ref(false)

// Sidebar selection state
const currentRuns = ref(1)
const currentDevice = ref('desktop')
const currentThrottle = ref('none')
const currentAuditView = ref('standard')

// Auth state
const user = ref(null)
const token = ref(null)

const login = (newToken, newUser) => {
  token.value = newToken
  user.value = newUser
  localStorage.setItem('lh_token', newToken)
  localStorage.setItem('lh_user', JSON.stringify(newUser))
}

const logout = () => {
  token.value = null
  user.value = null
  localStorage.removeItem('lh_token')
  localStorage.removeItem('lh_user')
  router.push('/auth')
}

// Clean up any existing theme classes on mount
onMounted(() => {
  document.documentElement.classList.remove('my-app-dark', 'dark')

  const storedToken = localStorage.getItem('lh_token')
  const storedUser = localStorage.getItem('lh_user')
  if (storedToken && storedUser) {
    token.value = storedToken
    user.value = JSON.parse(storedUser)
  }
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
provide('user', user)
provide('token', token)
provide('login', login)
provide('logout', logout)

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
      :user="user"
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
