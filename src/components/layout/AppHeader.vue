<script setup>
import { inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import ThemeToggler from './ThemeToggler.vue'
import Button from 'primevue/button'
import Menubar from 'primevue/menubar'

const router = useRouter()
const logout = inject('logout')

const props = defineProps({
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
  },
  user: {
    type: Object,
    default: null
  }
})

defineEmits(['toggle-sidebar', 'theme-change'])

const menuItems = computed(() => {
  const items = [
    { label: 'Home', icon: 'pi pi-home', command: () => router.push('/') },
    { label: 'Compare Results', icon: 'pi pi-upload', command: () => router.push('/upload') },
    { label: 'Documentation', icon: 'pi pi-book', command: () => router.push('/documentation') },
  ]
  if (props.user) {
    items.push({ label: 'History', icon: 'pi pi-history', command: () => router.push('/history') })
  }
  return items
})
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

    <!-- Right side - Auth + Theme toggler -->
    <div class="hidden md:flex items-center gap-2">
      <template v-if="user">
        <span :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ user.email }}</span>
        <Button
          label="Log out"
          severity="secondary"
          size="small"
          text
          @click="logout"
        />
      </template>
      <Button
        v-else
        label="Login"
        severity="secondary"
        size="small"
        outlined
        @click="router.push('/auth')"
      />
      <ThemeToggler
        :is-dark="isDarkMode"
        @theme-change="$emit('theme-change', $event)"
      />
    </div>
  </header>
</template>
