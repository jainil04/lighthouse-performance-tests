<script setup>
import { ref } from 'vue'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  isDarkMode: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: 'Enter URL to test'
  },
  label: {
    type: String,
    default: 'Website URL'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'url-change', 'submit'])

const inputValue = ref(props.modelValue)

const handleInput = (event) => {
  inputValue.value = event.target.value
  emit('update:modelValue', inputValue.value)
  emit('url-change', inputValue.value)
}

const handleSubmit = () => {
  emit('submit', inputValue.value)
}
</script>

<template>
  <div class="w-full">
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <FloatLabel variant="on">
          <InputText
            id="url_input"
            :value="inputValue"
            @input="handleInput"
            @keyup.enter="handleSubmit"
            :disabled="disabled || loading"
            :class="[
              'w-full',
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            ]"
            :placeholder="placeholder"
          />
        </FloatLabel>
      </div>

      <Button
        @click="handleSubmit"
        :icon="loading ? 'pi pi-spin pi-spinner' : 'pi pi-send'"
        severity="primary"
        rounded
        :disabled="!inputValue.trim() || disabled || loading"
        :aria-label="loading ? 'Running audit...' : 'Submit URL'"
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />
    </div>
  </div>
</template>
