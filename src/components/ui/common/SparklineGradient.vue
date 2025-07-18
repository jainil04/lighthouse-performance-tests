<template>
  <canvas ref="canvas" class="w-full block"></canvas>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  /**
   * Optional array of numeric values to plot. If omitted or empty, random data is generated.
   */
  data: {
    type: Array,
    default: () => []
  },
  /**
   * Number of points to generate if data is empty
   */
  randomCount: {
    type: Number,
    default: 6
  },
  /**
   * Line color (default: Tailwind orange-500)
   */
  strokeColor: {
    type: String,
    default: '#F97316'
  },
  /**
   * Gradient fill color at top (will fade to transparent)
   */
  gradientColor: {
    type: String,
    default: 'rgba(249, 115, 22, 0.4)'
  },
  /**
   * Chart height in pixels
   */
  height: {
    type: Number,
    default: 80
  },
  /**
   * Padding inside the canvas
   */
  padding: {
    type: Number,
    default: 8
  }
})

const canvas = ref(null)
const chartData = ref([])

/** Generate an array of random values between 0 and 100 */
function generateRandomArray(count) {
  return Array.from({ length: count }, () => Math.random() * 100)
}

// Populate chartData based on props.data or random
function prepareData() {
  chartData.value =
    Array.isArray(props.data) && props.data.length > 0
      ? props.data
      : generateRandomArray(props.randomCount)
}

function drawChart() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const w = c.clientWidth
  const h = props.height

  // set canvas size for high-DPI
  c.width = w * dpr
  c.height = h * dpr
  ctx.scale(dpr, dpr)

  // clear
  ctx.clearRect(0, 0, w, h)

  const vals = chartData.value
  const n = vals.length
  if (n === 0) return

  const pad = props.padding
  // compute points with scaling
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const range = max === min ? max || 1 : max - min
  const stepX = (w - pad * 2) / (n - 1 || 1)

  const points = vals.map((val, i) => {
    const x = pad + stepX * i
    const y = pad + (1 - (val - min) / range) * (h - pad * 2)
    return { x, y }
  })

  // build gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, props.gradientColor)
  grad.addColorStop(1, 'rgba(249, 115, 22, 0)')

  // draw smooth path using quadratic curves
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cx = (prev.x + curr.x) / 2
    const cy = (prev.y + curr.y) / 2
    ctx.quadraticCurveTo(prev.x, prev.y, cx, cy)
  }
  // line to last point
  const last = points[points.length - 1]
  ctx.lineTo(last.x, last.y)

  // stroke line
  ctx.strokeStyle = props.strokeColor
  ctx.lineWidth = 2
  ctx.stroke()

  // fill under line
  ctx.lineTo(last.x, h - pad)
  ctx.lineTo(points[0].x, h - pad)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()
}

onMounted(() => {
  prepareData()
  drawChart()
})

watch(() => props.randomCount, () => {
  prepareData()
  drawChart()
})

watch(() => props.data, () => {
  prepareData()
  drawChart()
}, { deep: true })
</script>

<style scoped>
canvas {
  height: v-bind(height + 'px');
  width: 100%;
}
</style>
