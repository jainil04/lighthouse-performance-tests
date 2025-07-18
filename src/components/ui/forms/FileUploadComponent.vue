<template>
  <div class="w-full">
    <label :class="['block text-sm font-medium mb-2', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
      Upload URLs File
    </label>
    <div class="card">
      <FileUpload
        name="urls[]"
        @select="onSelectedFiles"
        :multiple="true"
        accept=".txt,.csv,.json"
        :maxFileSize="1000000"
        :auto="true"
        :class="[
          'w-full',
          isDarkMode ? 'p-fileupload-dark' : 'p-fileupload-light'
        ]"
      >
        <template #header="{ chooseCallback, clearCallback, files }">
          <div class="flex flex-wrap justify-between items-center flex-1 gap-4">
            <div class="flex gap-2">
              <Button @click="chooseCallback()" icon="pi pi-upload" rounded outlined severity="secondary"></Button>
              <Button @click="clearCallback()" icon="pi pi-times" rounded outlined severity="danger" :disabled="!files || files.length === 0"></Button>
            </div>
            <ProgressBar :value="totalSizePercent" :showValue="false" class="md:w-20rem h-1 w-full md:ml-auto">
              <span class="whitespace-nowrap">{{ totalSize }}B / 1MB</span>
            </ProgressBar>
          </div>
        </template>

        <template #content>
          <div class="flex flex-col gap-8 pt-4">
            <div v-if="uploadedFiles.length > 0">
              <h5 :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']">Completed</h5>
              <div class="flex flex-wrap gap-4">
                <div v-for="(file, index) of uploadedFiles" :key="file.name + file.type + file.size" :class="[
                  'p-8 rounded-border flex flex-col border items-center gap-4',
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                ]">
                  <div>
                    <i class="pi pi-file text-6xl text-green-500" />
                  </div>
                  <span :class="['font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden', isDarkMode ? 'text-gray-200' : 'text-gray-700']">{{ file.name }}</span>
                  <div :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ formatSize(file.size) }}</div>
                  <Badge value="Completed" class="mt-4" severity="success" />
                  <Button icon="pi pi-times" @click="removeUploadedFile(index)" outlined rounded severity="danger" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="flex items-center justify-center flex-col">
            <i :class="[
              'pi pi-cloud-upload !border-2 !rounded-full !p-8 !text-4xl',
              isDarkMode ? '!text-gray-400 !border-gray-600' : '!text-gray-400 !border-gray-300'
            ]" />
            <p :class="['mt-6 mb-0', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Drag and drop files to here to upload.
            </p>
          </div>
        </template>
      </FileUpload>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FileUpload from 'primevue/fileupload'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import Badge from 'primevue/badge'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['file-upload'])

const totalSize = ref(0)
const totalSizePercent = ref(0)
const files = ref([])
const uploadedFiles = ref([])

const removeUploadedFile = (index) => {
  const removedFile = uploadedFiles.value[index]
  uploadedFiles.value.splice(index, 1)

  // Also remove from files array
  const fileIndex = files.value.findIndex(f => f.name === removedFile.name)
  if (fileIndex > -1) {
    files.value.splice(fileIndex, 1)
  }

  // Update total size
  totalSize.value -= parseInt(formatSize(removedFile.size))

  if (uploadedFiles.value.length === 0) {
    totalSizePercent.value = 0
    totalSize.value = 0
  }
}

const onRemoveTemplatingFile = (file, removeFileCallback, index) => {
  removeFileCallback(index)
  totalSize.value -= parseInt(formatSize(file.size))
  updateProgress()
}

const updateProgress = () => {
  if (files.value.length === 0) {
    totalSizePercent.value = 0
  } else {
    totalSizePercent.value = (uploadedFiles.value.length / files.value.length) * 100
  }
}

const onClearTemplatingUpload = (clear) => {
  clear()
  totalSize.value = 0
  totalSizePercent.value = 0
  files.value = []
  uploadedFiles.value = []
}

const onSelectedFiles = (event) => {
  files.value = event.files
  uploadedFiles.value = [...event.files] // Immediately mark as uploaded

  totalSize.value = 0
  files.value.forEach((file) => {
    totalSize.value += parseInt(formatSize(file.size))
  })

  // Set progress to 100% since we're processing locally
  totalSizePercent.value = 100

  // Emit file selection event
  emit('file-upload', { type: 'selected', files: event.files })
}

const formatSize = (bytes) => {
  const k = 1024
  const dm = 3
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  if (bytes === 0) {
    return `0 ${sizes[0]}`
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

  return `${formattedSize} ${sizes[i]}`
}
</script>

<style scoped>
/* Custom styles for dark mode file upload */
:deep(.p-fileupload-dark) {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
}

:deep(.p-fileupload-dark .p-fileupload-content) {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
}

:deep(.p-fileupload-light) {
  background-color: white;
  border-color: rgb(229, 231, 235);
}
</style>