<script setup>
import ThemeToggler from './ThemeToggler.vue'
import Button from 'primevue/button'

defineProps({
  logoSrc: {
    type: String,
    default: '/vite.svg'
  },
  logoAlt: {
    type: String,
    default: 'Logo'
  },
  title: {
    type: String,
    default: ''
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-sidebar', 'theme-change'])
</script>

<template>
  <header :class="['w-full border-b px-4 py-3 flex items-center justify-between', isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
    <!-- Left side - Menu button, logo and title -->
    <div class="flex items-center space-x-3">
      <Button
        @click="$emit('toggle-sidebar')"
        icon="pi pi-bars"
        severity="secondary"
        text
        rounded
        aria-label="Toggle sidebar"
      />
      <img :src="logoSrc" :alt="logoAlt" class="w-8 h-8">
      <span v-if="title" :class="['text-lg font-medium', isDarkMode ? 'text-white' : 'text-gray-900']">{{ title }}</span>
    </div>

    <!-- Right side - Theme toggler -->
    <div class="flex items-center">
      <ThemeToggler
        :is-dark="isDarkMode"
        @theme-change="$emit('theme-change', $event)"
      />
    </div>
  </header>
</template>
