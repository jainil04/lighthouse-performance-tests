<script setup>
import Select from 'primevue/select'
import { ref } from 'vue'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const runsOptions = ref([
  { label: "1 Run", value: 1 },
  { label: "2 Runs", value: 2 },
  { label: "3 Runs", value: 3 },
  { label: "4 Runs", value: 4 },
  { label: "5 Runs", value: 5 },
  { label: "6 Runs", value: 6 },
  { label: "7 Runs", value: 7 },
  { label: "8 Runs", value: 8 },
  { label: "9 Runs", value: 9 },
  { label: "10 Runs", value: 10 }
])

const selectedRuns = ref(1)

const emit = defineEmits(['runs-change'])

const handleRunsChange = (value) => {
  emit('runs-change', value)
}
</script>

<template>
  <div class="w-full">
    <label :class="['block text-sm font-medium mb-2', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
      Number of Runs
    </label>
    <Select
      v-model="selectedRuns"
      :options="runsOptions"
      optionLabel="label"
      optionValue="value"
      placeholder="Select Runs"
      checkmark
      :highlightOnSelect="false"
      :class="[
        'w-full',
        isDarkMode ? 'p-component-dark' : 'p-component-light'
      ]"
      @change="handleRunsChange($event.value)"
    />
  </div>
</template>
