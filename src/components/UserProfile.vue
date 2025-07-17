<script setup>
defineProps({
  userName: {
    type: String,
    default: 'User'
  },
  userAvatar: {
    type: String,
    default: ''
  },
  showDropdown: {
    type: Boolean,
    default: false
  }
})

defineEmits(['profile-click', 'logout'])
</script>

<template>
  <div class="relative">
    <button
      @click="$emit('profile-click')"
      class="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
    >
      <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
        <i v-if="!userAvatar" class="pi pi-user text-white text-sm"></i>
        <img v-else :src="userAvatar" :alt="userName" class="w-full h-full rounded-full object-cover">
      </div>
      <span class="text-sm font-medium text-gray-700 hidden md:block">{{ userName }}</span>
      <i class="pi pi-chevron-down text-xs text-gray-500 hidden md:block"></i>
    </button>

    <!-- Dropdown menu (you can enhance this with proper dropdown functionality) -->
    <div v-if="showDropdown" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
      <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile Settings</a>
      <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Preferences</a>
      <hr class="my-1">
      <button
        @click="$emit('logout')"
        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        Sign Out
      </button>
    </div>
  </div>
</template>
