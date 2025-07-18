<script setup>
import DeviceSelector from '../ui/forms/DeviceSelector.vue'
import ThrottleSelector from '../ui/forms/ThrottleSelector.vue'
import RunsSelector from '../ui/forms/RunsSelector.vue'
import AuditViewSelector from '../ui/forms/AuditViewSelector.vue'
import ThemeToggler from './ThemeToggler.vue'
import { onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true
  },
  isDarkMode: {
    type: Boolean,
    default: false
  },
  currentRuns: {
    type: Number,
    default: 1
  }
})

// Navigation items
const navigationItems = [
  {
    label: 'Home',
    icon: 'pi pi-home',
    path: '/'
  },
  {
    label: 'Compare Results',
    icon: 'pi pi-upload',
    path: '/upload'
  },
  {
    label: 'Documentation',
    icon: 'pi pi-book',
    path: '/documentation'
  },
]

// Clean up on unmount
onUnmounted(() => {
  document.body.style.overflow = ''
})

const emit = defineEmits(['device-change', 'throttle-change', 'runs-change', 'audit-view-change', 'close-sidebar', 'theme-change'])

// Touch handling for swipe to close
let touchStartX = 0
let touchEndX = 0

const handleTouchStart = (e) => {
  touchStartX = e.changedTouches[0].screenX
}

const handleTouchEnd = (e) => {
  touchEndX = e.changedTouches[0].screenX
  handleSwipe()
}

const handleSwipe = () => {
  const swipeDistance = touchEndX - touchStartX
  const minSwipeDistance = 50

  // Swipe left to close
  if (swipeDistance < -minSwipeDistance) {
    handleCloseSidebar()
  }
}

const handleDeviceChange = (value) => {
  emit('device-change', value)
}

const handleThrottleChange = (value) => {
  emit('throttle-change', value)
}

const handleRunsChange = (value) => {
  emit('runs-change', value)
}

const handleAuditViewChange = (value) => {
  emit('audit-view-change', value)
}

const handleThemeChange = (isDark) => {
  emit('theme-change', isDark)
}

const handleCloseSidebar = () => {
  emit('close-sidebar')
}

const handleNavigation = (path) => {
  router.push(path)
  // Close sidebar after navigation on mobile
  if (window.innerWidth < 1024) {
    handleCloseSidebar()
  }
}

const isActiveRoute = (path) => {
  return route.path === path
}
</script>

<template>
  <!-- Mobile Overlay -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
    @click="handleCloseSidebar"
  ></div>

  <!-- Sidebar -->
  <aside
    :class="[
      'fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out border-r',
      'lg:relative lg:transform-none lg:z-10 lg:block',
      'lg:rounded-tr-3xl lg:rounded-br-3xl lg:mt-6 lg:mb-6',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      isOpen ? 'lg:opacity-100' : 'lg:opacity-0 sidebar-closed',
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    ]"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- Mobile Header -->
    <div class="flex items-center justify-between p-4 border-b lg:hidden" :class="[
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    ]">
      <div class="flex items-center">
        <i class="pi pi-bolt text-blue-500 mr-2 text-xl"></i>
        <h2 :class="[
          'text-lg font-semibold',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]">Lighthouse</h2>
      </div>
      <button
        @click="handleCloseSidebar"
        :class="[
          'p-2 rounded-lg hover:bg-gray-100 transition-colors',
          isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
        ]"
      >
        <i class="pi pi-times text-xl"></i>
      </button>
    </div>

    <!-- Navigation Content -->
    <nav
      :class="[
        'h-full py-4 transition-opacity duration-300 ease-in-out overflow-y-auto',
        isOpen ? 'opacity-100' : 'opacity-0 lg:opacity-0'
      ]"
      style="width: 100%; padding-bottom: 80px;"
    >
      <div class="px-4 lg:px-3 space-y-8">
        <!-- Navigation Links (Mobile Only) -->
        <div class="lg:hidden">
          <div class="grid grid-cols-3 gap-4">
            <button
              v-for="item in navigationItems"
              :key="item.path"
              @click="handleNavigation(item.path)"
              :class="[
                'flex flex-col items-center p-4 rounded-xl text-center transition-all duration-200',
                isActiveRoute(item.path)
                  ? isDarkMode
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-blue-100 text-blue-700 shadow-md'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              ]"
            >
              <i :class="[item.icon, 'text-2xl mb-2']"></i>
              <span class="text-xs font-medium">{{ item.label }}</span>
            </button>
          </div>
        </div>

        <!-- Visual Separator -->
        <div class="lg:hidden">
          <div :class="[
            'h-px w-full',
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          ]"></div>
        </div>

        <!-- Test Configuration -->
        <div>
          <div class="space-y-4">
            <DeviceSelector
              :is-dark-mode="isDarkMode"
              @device-change="handleDeviceChange"
            />

            <ThrottleSelector
              :is-dark-mode="isDarkMode"
              @throttle-change="handleThrottleChange"
            />

            <RunsSelector
              :is-dark-mode="isDarkMode"
              :model-value="currentRuns"
              @runs-change="handleRunsChange"
            />

            <AuditViewSelector
              :is-dark-mode="isDarkMode"
              @audit-view-change="handleAuditViewChange"
            />
          </div>
        </div>

        <!-- Theme Toggle (Mobile Only) -->
        <div class="lg:hidden">
          <div :class="[
            'h-px w-full mb-4',
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          ]"></div>
          <div class="flex items-center justify-between">
            <span :class="[
              'text-sm font-medium',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            ]">Theme</span>
            <ThemeToggler
              :is-dark="isDarkMode"
              @theme-change="handleThemeChange"
            />
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
/* Mobile-first approach */
aside {
  width: 100vw;
}

/* Desktop styles */
@media (min-width: 1024px) {
  aside {
    width: 256px;
    min-height: 500px;
  }

  aside.sidebar-closed {
    width: 0px;
    overflow: hidden;
  }
}

/* Smooth transitions */
.transition-transform {
  transition: transform 0.3s ease-in-out;
}
</style>
