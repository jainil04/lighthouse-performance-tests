<script setup>
import DeviceSelector from '../ui/forms/DeviceSelector.vue'
import ThrottleSelector from '../ui/forms/ThrottleSelector.vue'
import RunsSelector from '../ui/forms/RunsSelector.vue'
import AuditViewSelector from '../ui/forms/AuditViewSelector.vue'
import { watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

// Debug watch
watch(() => props.isOpen, (newVal) => {
  console.log('Sidebar isOpen changed to:', newVal)
})

const emit = defineEmits(['device-change', 'throttle-change', 'runs-change', 'audit-view-change'])

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
</script>

<template>
  <aside
    :class="[
      'h-screen mb-6 transition-all duration-500 ease-in-out relative z-10 border-r rounded-tr-3xl rounded-br-3xl sidebar-curve mt-6',
      isOpen ? 'opacity-100' : 'opacity-0',
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    ]"
    :style="{
      width: isOpen ? '256px' : '0px',
      overflow: isOpen ? 'visible' : 'hidden',
      backgroundColor: isOpen ? (isDarkMode ? '#1f2937' : '#ffffff') : 'transparent',
      minHeight: '500px'
    }"
  >
    <nav
      :class="[
        'h-full py-4 transition-opacity duration-300 ease-in-out',
        isOpen ? 'opacity-100' : 'opacity-0'
      ]"
      style="overflow-y: auto; width: 256px;"
    >      <div class="px-3 space-y-4">
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
          @runs-change="handleRunsChange"
        />

        <AuditViewSelector
          :is-dark-mode="isDarkMode"
          @audit-view-change="handleAuditViewChange"
        />
      </div>
    </nav>
  </aside>
</template>
