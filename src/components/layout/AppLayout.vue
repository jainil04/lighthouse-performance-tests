<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'

const props = defineProps({
  headerTitle: {
    type: String,
    default: 'Lighthouse Performance Tests'
  },
  logoSrc: {
    type: String,
    default: '/vite.svg'
  },
  isDarkMode: {
    type: Boolean,
    default: false
  },
  currentRuns: {
    type: Number,
    default: 1
  },
  currentDevice: {
    type: String,
    default: 'desktop'
  },
  currentThrottle: {
    type: String,
    default: 'none'
  },
  currentAuditView: {
    type: String,
    default: 'standard'
  },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['navigation-change', 'theme-change', 'device-change', 'throttle-change', 'runs-change', 'audit-view-change'])

const route = useRoute()

// Responsive sidebar state
const sidebarOpen = ref(false)

// Saved state so we can restore it when leaving /history
let sidebarStateBeforeHistory = null

// Check if we're on desktop
const isDesktop = () => window.innerWidth >= 1024

// Initialize sidebar state based on screen size
const initializeSidebar = () => {
  sidebarOpen.value = isDesktop()
}

// Handle window resize — don't reopen while on /history
const handleResize = () => {
  if (route.path === '/history') return
  if (isDesktop()) {
    sidebarOpen.value = true
  } else {
    sidebarOpen.value = false
  }
}

// Auto-collapse on /history, restore on leave
watch(() => route.path, (newPath, oldPath) => {
  if (newPath === '/history') {
    sidebarStateBeforeHistory = sidebarOpen.value
    sidebarOpen.value = false
  } else if (oldPath === '/history' && sidebarStateBeforeHistory !== null) {
    sidebarOpen.value = sidebarStateBeforeHistory
    sidebarStateBeforeHistory = null
  }
})

onMounted(() => {
  initializeSidebar()
  window.addEventListener('resize', handleResize)
  // Handle direct navigation / page refresh on /history
  if (route.path === '/history') {
    sidebarStateBeforeHistory = isDesktop()
    sidebarOpen.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
  console.log('Sidebar toggled:', sidebarOpen.value)
}

const handleThemeChange = (isDark) => {
  console.log('Theme change event received:', isDark)
  emit('theme-change', isDark)
}

const handleDeviceChange = (device) => {
  console.log('Device changed to:', device)
  emit('device-change', device)
}

const handleThrottleChange = (throttle) => {
  console.log('Throttle changed to:', throttle)
  emit('throttle-change', throttle)
}

const handleRunsChange = (runs) => {
  console.log('Number of runs changed to:', runs)
  emit('runs-change', runs)
}

const handleAuditViewChange = (auditView) => {
  console.log('Audit view changed to:', auditView)
  emit('audit-view-change', auditView)
}

const handleCloseSidebar = () => {
  sidebarOpen.value = false
  console.log('Sidebar closed')
}
</script>

<template>
  <div :class="['w-screen min-h-screen full-width', isDarkMode ? 'bg-gray-900' : 'bg-gray-50']">
    <!-- Header -->
    <AppHeader
      :logo-src="logoSrc"
      :title="headerTitle"
      :is-dark-mode="isDarkMode"
      :user="user"
      @toggle-sidebar="toggleSidebar"
      @theme-change="handleThemeChange"
    />

    <div class="flex w-full relative">
      <!-- Sidebar -->
      <AppSidebar
        :is-open="sidebarOpen"
        :is-dark-mode="isDarkMode"
        :current-runs="currentRuns"
        :current-device="currentDevice"
        :current-throttle="currentThrottle"
        :current-audit-view="currentAuditView"
        @device-change="handleDeviceChange"
        @throttle-change="handleThrottleChange"
        @runs-change="handleRunsChange"
        @audit-view-change="handleAuditViewChange"
        @close-sidebar="handleCloseSidebar"
        @theme-change="handleThemeChange"
      />

      <!-- Main Content Area -->
      <main
        :class="[
          'flex-1 w-full transition-all duration-300 ease-in-out',
          'lg:ml-0',
          sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
        ]"
      >
        <div class="p-6 w-full">
          <slot>
            <!-- Default content if no slot provided -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full">
              <h1 class="text-2xl font-semibold text-gray-900 mb-4">Welcome</h1>
              <p class="text-gray-600">Select an item from the sidebar to get started.</p>
            </div>
          </slot>
        </div>
      </main>
    </div>
  </div>
</template>
