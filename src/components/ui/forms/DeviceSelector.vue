<script setup>
import SelectButton from 'primevue/selectbutton'
import { ref } from 'vue'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const deviceOptions = ref([
  { value: 'desktop', icon: 'pi pi-desktop' },
  { value: 'mobile', icon: 'pi pi-mobile' }
])

const selectedDevice = ref('desktop')

const emit = defineEmits(['device-change'])

const handleDeviceChange = (value) => {
  emit('device-change', value)
}
</script>

<template>
  <div class="w-full">
    <label :class="['block text-sm font-medium mb-2', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
      Select Device
    </label>
    <SelectButton
      v-model="selectedDevice"
      :options="deviceOptions"
      optionLabel="value"
      optionValue="value"
      :class="[
        'w-full [&_.p-button]:!m-0 [&_.p-button]:!p-2',
        isDarkMode ? 'p-component-dark' : 'p-component-light'
      ]"
      @change="handleDeviceChange($event.value)"
    >
      <template #option="{ option }">
        <i :class="option.icon" class="text-lg"></i>
      </template>
    </SelectButton>
  </div>
</template>
