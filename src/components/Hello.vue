<template>
  <div>
    <Button
        @click="loadProducts"
        :icon="loading ? 'pi pi-spin pi-spinner' : 'pi pi-send'"
        severity="primary"
        rounded
        :class="[
          isDarkMode ? 'p-component-dark' : 'p-component-light'
        ]"
      />
    <ul v-if="products.length">
      <li v-for="p in products" :key="p.id">{{ p.name }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'

const products = ref([])

async function loadProducts() {
  try {
    // relative path to your Vercel serverless function
    const res = await fetch('/api/hello')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    products.value = await res.json()
  } catch (err) {
    console.error('Failed to load products:', err)
  }
}
</script>
