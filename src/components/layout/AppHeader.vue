<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ThemeToggler from './ThemeToggler.vue'
import Button from 'primevue/button'
import Menubar from 'primevue/menubar'

const router = useRouter()
const route = useRoute()

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

const menuItems = ref([
  {
    label: 'Home',
    icon: 'pi pi-home',
    command: () => {
      router.push('/')
    }
  },
  {
    label: 'Compare Results',
    icon: 'pi pi-upload',
    command: () => {
      router.push('/upload')
    }
  },
  {
    label: 'Documentation',
    icon: 'pi pi-book',
    command: () => {
      router.push('/documentation')
    }
  },
])
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

    <!-- Center - Navigation Menubar -->
    <div class="hidden md:block">
      <Menubar
        :model="menuItems"
        :class="[
          'border-0 bg-transparent p-0',
          isDarkMode ? 'text-white' : 'text-gray-900'
        ]"
      />
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
