<template>
  <div class="min-h-screen p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header Section -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 :class="['text-3xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-gray-900']">
              File Upload & Comparison
            </h1>
            <p :class="['text-lg', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
              Upload and compare CSV files from your Lighthouse audits
            </p>
          </div>
        </div>
      </div>

      <!-- Upload Section -->
      <div class="mb-8">
        <div :class="[
          'rounded-lg border p-6',
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        ]">
          <h2 :class="['text-xl font-semibold mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
            Upload Files
          </h2>
          <FileUploadComponent
            :is-dark-mode="isDarkMode"
            @file-upload="handleFileUpload"
          />
        </div>
      </div>

      <!-- Tables Section -->
      <div v-if="uploadedFiles.length > 0" class="space-y-8">
        <div
          v-for="(fileData, index) in uploadedFiles"
          :key="`file-${index}`"
          :class="[
            'rounded-lg border p-6',
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          ]"
        >
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 :class="['text-lg font-semibold mb-2', isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ fileData.fileName }}
              </h3>
              <!-- Display Device, URL, and Throttling metadata -->
              <div class="flex flex-wrap gap-4 text-sm">
                <div v-if="fileData.metadata.Device" class="flex items-center gap-1">
                  <i class="pi pi-desktop" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" />
                  <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Device:</span>
                  <span :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'">{{ fileData.metadata.Device }}</span>
                </div>
                <div v-if="fileData.metadata.Throttling" class="flex items-center gap-1">
                  <i class="pi pi-wifi" :class="isDarkMode ? 'text-green-400' : 'text-green-600'" />
                  <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Throttling:</span>
                  <span :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'">{{ fileData.metadata.Throttling }}</span>
                </div>
                <div v-if="fileData.metadata.URL" class="flex items-center gap-1">
                  <i class="pi pi-link" :class="isDarkMode ? 'text-purple-400' : 'text-purple-600'" />
                  <span :class="['font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">URL:</span>
                  <span :class="['truncate max-w-md', isDarkMode ? 'text-gray-200' : 'text-gray-900']" :title="fileData.metadata.URL">{{ fileData.metadata.URL }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge :value="`${fileData.data.length} rows`" severity="info" />
              <Button
                icon="pi pi-times"
                @click="removeFile(index)"
                outlined
                rounded
                severity="danger"
                size="small"
              />
            </div>
          </div>

          <DataTableComponent
            :data="fileData.data"
            :headers="fileData.headers"
            :is-dark-mode="isDarkMode"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <i :class="[
          'pi pi-upload text-6xl mb-4',
          isDarkMode ? 'text-gray-500' : 'text-gray-400'
        ]" />
        <h3 :class="['text-xl font-semibold mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
          No files uploaded yet
        </h3>
        <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          Upload CSV files to view and compare their contents
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import FileUploadComponent from '../components/ui/forms/FileUploadComponent.vue'
import DataTableComponent from '../components/ui/common/DataTableComponent.vue'
import Button from 'primevue/button'
import Badge from 'primevue/badge'

// Get dark mode from parent layout
const isDarkMode = inject('isDarkMode', ref(false))

const uploadedFiles = ref([])

const handleFileUpload = async (event) => {
  if (event.type === 'selected') {
    // Process selected files
    for (const file of event.files) {
      try {
        const content = await readFileContent(file)
        const parsedData = parseCSV(content)

        uploadedFiles.value.push({
          fileName: file.name,
          fileSize: file.size,
          data: parsedData.data,
          headers: parsedData.headers,
          metadata: parsedData.metadata
        })
      } catch (error) {
        console.error('Error reading file:', error)
      }
    }
  }
}

const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

const parseCSV = (content) => {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], data: [], metadata: {} }

  const allHeaders = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))

  // Columns to extract as metadata (remove from table)
  const metadataColumns = ['Device', 'URL', 'Throttling']

  // Get headers for the table (exclude metadata columns)
  const tableHeaders = allHeaders.filter(col => !metadataColumns.includes(col))

  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim().replace(/"/g, ''))
    const row = {}
    allHeaders.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  })

  // Extract metadata from the first row (assuming all rows have same metadata)
  const metadata = {}
  if (data.length > 0) {
    metadataColumns.forEach(col => {
      if (allHeaders.includes(col)) {
        metadata[col] = data[0][col]
      }
    })
  }

  // Remove metadata columns from data rows
  const cleanedData = data.map(row => {
    const cleanRow = { ...row }
    metadataColumns.forEach(col => {
      delete cleanRow[col]
    })
    return cleanRow
  })

  return { headers: tableHeaders, data: cleanedData, metadata }
}

const removeFile = (index) => {
  uploadedFiles.value.splice(index, 1)
}
</script>
