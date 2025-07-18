<script setup>
import Select from 'primevue/select'
import { ref } from 'vue'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: Number,
    default: 1
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

const selectedRuns = ref(props.modelValue)

const emit = defineEmits(['runs-change', 'update:modelValue'])

const handleRunsChange = (value) => {
  selectedRuns.value = value
  emit('runs-change', value)
  emit('update:modelValue', value)
  console.log('RunsSelector: Emitting runs-change with value:', value)
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
