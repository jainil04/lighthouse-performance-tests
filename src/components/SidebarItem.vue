<script setup>
defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  href: {
    type: String,
    default: '#'
  }
})

defineEmits(['click'])
</script>

<template>
  <a
    :href="href"
    @click="$emit('click', $event)"
    :class="[
      'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200',
      isActive
        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    ]"
  >
    <i :class="['pi', icon, 'mr-3 text-lg']"></i>
    <span>{{ label }}</span>
  </a>
</template>
