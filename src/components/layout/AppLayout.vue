<script setup>
import { ref } from 'vue'
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
})

const emit = defineEmits(['navigation-change', 'theme-change', 'device-change', 'throttle-change', 'runs-change', 'audit-view-change'])

const sidebarOpen = ref(true)
const isDarkMode = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
  console.log('Sidebar toggled:', sidebarOpen.value)
}

const handleItemClick = (item) => {
  // Update active state
  props.navigationItems.forEach(navItem => {
    navItem.isActive = navItem.label === item.label
  })

  // Emit navigation change
  emit('navigation-change', item)
}

const handleThemeChange = (isDark) => {
  isDarkMode.value = isDark
  emit('theme-change', isDark)

  // Apply theme class to document
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
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
</script>

<template>
  <div :class="['w-screen min-h-screen full-width', isDarkMode ? 'bg-gray-900' : 'bg-gray-50']">
    <!-- Header -->
    <AppHeader
      :logo-src="logoSrc"
      :title="headerTitle"
      :is-dark-mode="isDarkMode"
      @toggle-sidebar="toggleSidebar"
      @theme-change="handleThemeChange"
    />

    <div class="flex w-full">
      <!-- Sidebar -->
      <AppSidebar
        :is-open="sidebarOpen"
        :is-dark-mode="isDarkMode"
        @item-click="handleItemClick"
        @device-change="handleDeviceChange"
        @throttle-change="handleThrottleChange"
        @runs-change="handleRunsChange"
        @audit-view-change="handleAuditViewChange"
      />

      <!-- Main Content Area -->
      <main
        :class="[
          'flex-1 w-full transition-all duration-300 ease-in-out',
          sidebarOpen ? 'ml-0' : 'ml-0'
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
