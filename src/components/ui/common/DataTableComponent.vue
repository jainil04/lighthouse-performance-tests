<template>
  <div class="w-full">
    <DataTable
      :value="data"
      :paginator="data.length > 10"
      :rows="10"
      :rowsPerPageOptions="[5, 10, 25, 50]"
      responsiveLayout="scroll"
      :class="[
        'w-full',
        isDarkMode ? 'p-datatable-dark' : 'p-datatable-light'
      ]"
    >
      <Column
        v-for="header in headers"
        :key="header"
        :field="header"
        :header="header"
        :sortable="true"
        class="text-sm"
      >
        <template #body="{ data: rowData }">
          <span :class="[isDarkMode ? 'text-gray-200' : 'text-gray-900']">
            {{ formatCellValue(rowData[header]) }}
          </span>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-4">
          <i :class="[
            'pi pi-inbox text-4xl mb-2',
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          ]" />
          <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            No data available
          </p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  headers: {
    type: Array,
    default: () => []
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const formatCellValue = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    return value.toLocaleString()
  }
  return String(value)
}
</script>

<style scoped>
/* Custom styles for dark mode data table */
:deep(.p-datatable-dark) {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
}

:deep(.p-datatable-dark .p-datatable-header) {
  background-color: rgb(75, 85, 99);
  border-color: rgb(107, 114, 128);
  color: rgb(243, 244, 246);
}

:deep(.p-datatable-dark .p-datatable-tbody > tr) {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
}

:deep(.p-datatable-dark .p-datatable-tbody > tr:hover) {
  background-color: rgb(75, 85, 99);
}

:deep(.p-datatable-dark .p-datatable-thead > tr > th) {
  background-color: rgb(75, 85, 99);
  border-color: rgb(107, 114, 128);
  color: rgb(243, 244, 246);
}

:deep(.p-datatable-light) {
  background-color: white;
  border-color: rgb(229, 231, 235);
}

:deep(.p-datatable-light .p-datatable-header) {
  background-color: rgb(249, 250, 251);
  border-color: rgb(229, 231, 235);
}

:deep(.p-datatable-light .p-datatable-tbody > tr:hover) {
  background-color: rgb(249, 250, 251);
}
</style>
