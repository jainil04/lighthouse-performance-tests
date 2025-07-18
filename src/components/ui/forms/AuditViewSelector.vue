<script setup>
import { ref, watch } from 'vue'
import SelectButton from 'primevue/selectbutton'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: String,
    default: 'standard'
  }
})

const emit = defineEmits(['audit-view-change'])

const auditViewOptions = ref([
  { label: 'Standard', value: 'standard' },
  { label: 'Full', value: 'full' }
])

const selectedAuditView = ref(props.modelValue)

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  selectedAuditView.value = newValue
})

const handleAuditViewChange = () => {
  emit('audit-view-change', selectedAuditView.value)
}

// Audit categories for Standard View
const standardAudits = ref([
  { name: 'First Contentful Paint', category: 'Performance', icon: 'pi pi-clock' },
  { name: 'Largest Contentful Paint', category: 'Performance', icon: 'pi pi-clock' },
  { name: 'Speed Index', category: 'Performance', icon: 'pi pi-gauge' },
  { name: 'Cumulative Layout Shift', category: 'Performance', icon: 'pi pi-arrows-alt' },
  { name: 'Total Blocking Time', category: 'Performance', icon: 'pi pi-stopwatch' },
  { name: 'Time to Interactive', category: 'Performance', icon: 'pi pi-play' },
  { name: 'Server Response Time', category: 'Performance', icon: 'pi pi-server' },
])

// Full audit list
const fullAudits = ref([
  { name: 'All audit values', category: 'Complete', icon: 'pi pi-list' }
])
</script>

<template>
  <div class="space-y-4">
    <!-- Label -->
    <div>
      <label :class="[
        'text-sm font-medium block mb-2',
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      ]">
        Audit View
      </label>

      <!-- SelectButton -->
      <SelectButton
        v-model="selectedAuditView"
        :options="auditViewOptions"
        option-label="label"
        option-value="value"
        @change="handleAuditViewChange"
        :class="[
          'w-full',
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />
    </div>

    <!-- Audit List based on selection -->
    <div v-if="selectedAuditView" class="mt-4">
      <div :class="[
        'p-3 rounded-lg border text-xs',
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-50 border-gray-200'
      ]">
        <!-- Standard View List -->
        <div v-if="selectedAuditView === 'standard'" class="space-y-2">
          <div
            v-for="audit in standardAudits"
            :key="audit.name"
            class="flex items-center gap-2"
          >
            <i :class="[
              audit.icon,
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            ]"></i>
            <span :class="[
              'text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            ]">{{ audit.name }}</span>
          </div>
        </div>

        <!-- Full View List -->
        <div v-if="selectedAuditView === 'full'" class="space-y-1">
          <div
            v-for="audit in fullAudits"
            :key="audit.name"
            class="flex items-center gap-2 py-1"
          >
            <i :class="[audit.icon, isDarkMode ? 'text-gray-400' : 'text-gray-500']"></i>
            <span :class="[
              'text-xs',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            ]">{{ audit.name }}</span>
            <span :class="[
              'ml-auto text-xs px-2 py-1 rounded',
              isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
            ]">{{ audit.category }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
