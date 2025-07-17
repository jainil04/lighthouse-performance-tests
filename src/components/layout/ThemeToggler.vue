<script setup>
import { ref, watch } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'

const props = defineProps({
  isDark: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['theme-change'])

const darkMode = ref(props.isDark)

// Watch for prop changes to keep in sync
watch(() => props.isDark, (newValue) => {
  darkMode.value = newValue
})

// Handle the change event from ToggleSwitch
const handleToggleChange = () => {
  emit('theme-change', darkMode.value)
}
</script>

<template>
  <div class="flex items-center space-x-3 ">
    <!-- <i class="pi pi-sun text-yellow-500 text-sm"></i> -->
    <ToggleSwitch
      v-model="darkMode"
      @change="handleToggleChange"
      class="cursor-pointer"
    >
      <template #handle="{ checked }">
        <i
          :class="[
            '!text-xs pi',
            { 'pi-moon text-slate-200': checked, 'pi-sun text-yellow-400': !checked },
          ]"
        />
      </template>
    </ToggleSwitch>
    <!-- <i class="pi pi-moon text-slate-600 text-sm"></i> -->
  </div>
</template>
