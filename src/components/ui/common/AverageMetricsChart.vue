<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, toRefs } from 'vue'
import { Chart as ChartJS, BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend)

const props = defineProps({
  metrics: {
    type: Array,
    required: true
  },
  metricLabels: {
    type: Array,
    required: true
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const { metrics, metricLabels, isDarkMode } = toRefs(props)
const canvasRef = ref(null)
let chartInstance = null

function getChartData() {
  return {
    labels: metrics.value.map(m => `Run ${m.run}`),
    datasets: metricLabels.value.map(label => {
      return {
        label: label,
        data: metrics.value.map(m => m.values[label]),
        backgroundColor: 'rgba(255, 99, 132, 0.4)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        borderRadius: 50,
        barPercentage: 0.7,
        categoryPercentage: 0.7
      }
    })
  }
}

function getChartOptions() {
  return {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: isDarkMode.value ? '#fff' : '#333'
        }
      },
      title: {
        display: true,
        text: 'Average Metrics per Run',
        color: isDarkMode.value ? '#fff' : '#333',
        font: { size: 18 }
      }
    },
    scales: {
      x: {
        ticks: {
          color: isDarkMode.value ? '#fff' : '#333'
        },
        grid: {
          color: isDarkMode.value ? '#444' : '#eee'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: isDarkMode.value ? '#fff' : '#333'
        },
        grid: {
          color: isDarkMode.value ? '#444' : '#eee'
        }
      }
    }
  }
}

function renderChart() {
  if (canvasRef.value) {
    if (chartInstance) {
      chartInstance.destroy()
    }
    chartInstance = new ChartJS(canvasRef.value, {
      type: 'bar',
      data: getChartData(),
      options: getChartOptions()
    })
  }
}

onMounted(() => {
  nextTick(() => {
    renderChart()
  })
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

watch([metrics, metricLabels, isDarkMode], () => {
  renderChart()
})
</script>

<template>
  <div>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>
