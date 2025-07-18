<template>
  <div class="space-y-8">
    <!-- Hero Section -->
    <div :class="[
      'relative rounded-2xl p-8 md:p-12 overflow-hidden',
      isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    ]">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 left-0 w-full h-full">
          <svg viewBox="0 0 400 400" class="w-full h-full">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>
      </div>

      <div class="relative z-10">
        <div class="flex items-center mb-6">
          <div :class="[
            'w-16 h-16 rounded-full flex items-center justify-center mr-4',
            isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
          ]">
            <i class="pi pi-book text-white text-2xl"></i>
          </div>
          <div>
            <h1 :class="[
              'text-4xl font-bold mb-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            ]">Understanding Lighthouse Scoring</h1>
            <p :class="[
              'text-lg',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            ]">Learn how Google Lighthouse calculates performance metrics</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div v-for="(stat, index) in stats" :key="index" :class="[
            'p-4 rounded-lg',
            isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'
          ]">
            <div :class="[
              'text-2xl font-bold mb-1',
              stat.color
            ]">{{ stat.value }}</div>
            <div :class="[
              'text-sm',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            ]">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Score Categories Section -->
    <div :class="[
      'rounded-lg shadow-sm border p-8',
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    ]">
      <h2 :class="[
        'text-2xl font-bold mb-6',
        isDarkMode ? 'text-white' : 'text-gray-900'
      ]">The Four Pillars of Web Performance</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="category in categories" :key="category.key" :class="[
          'border rounded-lg p-6 hover:shadow-lg transition-all duration-300 cursor-pointer',
          isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
        ]" @click="selectedCategory = category.key">
          <div class="flex items-center mb-4">
            <div :class="[
              'w-12 h-12 rounded-full flex items-center justify-center mr-4',
              `bg-${category.color}-500`
            ]">
              <i :class="`pi ${category.icon} text-white text-xl`"></i>
            </div>
            <div>
              <h3 :class="[
                'text-xl font-semibold',
                isDarkMode ? 'text-white' : 'text-gray-900'
              ]">{{ category.name }}</h3>
              <div class="flex items-center mt-1">
                <div :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  `bg-${category.color}-100 text-${category.color}-800`
                ]">{{ category.weight }}% Weight</div>
              </div>
            </div>
          </div>
          <p :class="[
            'text-sm mb-4',
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          ]">{{ category.description }}</p>
          <div class="space-y-2">
            <div v-for="metric in category.metrics" :key="metric" :class="[
              'text-xs px-2 py-1 rounded inline-block mr-2 mb-1',
              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
            ]">{{ metric }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scoring System Section -->
    <div :class="[
      'rounded-lg shadow-sm border p-8',
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    ]">
      <h2 :class="[
        'text-2xl font-bold mb-6',
        isDarkMode ? 'text-white' : 'text-gray-900'
      ]">How Scores Are Calculated</h2>

      <div class="space-y-6">
        <!-- Score Ranges -->
        <div>
          <h3 :class="[
            'text-lg font-semibold mb-4',
            isDarkMode ? 'text-white' : 'text-gray-900'
          ]">Score Ranges</h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="range in scoreRanges" :key="range.label" :class="[
              'p-4 rounded-lg border-l-4',
              `border-${range.color}-500 bg-${range.color}-50`,
              isDarkMode ? `bg-${range.color}-900/20` : ''
            ]">
              <div class="flex items-center mb-2">
                <div :class="[
                  'w-4 h-4 rounded-full mr-2',
                  `bg-${range.color}-500`
                ]"></div>
                <span :class="[
                  'font-semibold',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                ]">{{ range.label }}</span>
              </div>
              <div :class="[
                'text-2xl font-bold mb-1',
                `text-${range.color}-600`
              ]">{{ range.range }}</div>
              <p :class="[
                'text-sm',
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              ]">{{ range.description }}</p>
            </div>
          </div>
        </div>

        <!-- Performance Metrics Deep Dive -->
        <div>
          <h3 :class="[
            'text-lg font-semibold mb-4',
            isDarkMode ? 'text-white' : 'text-gray-900'
          ]">Performance Metrics Breakdown</h3>

          <div class="space-y-4">
            <div v-for="metric in performanceMetrics" :key="metric.name" :class="[
              'p-4 rounded-lg border',
              isDarkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'
            ]">
              <div class="flex items-center justify-between mb-2">
                <h4 :class="[
                  'font-semibold',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                ]">{{ metric.name }}</h4>
                <span :class="[
                  'text-sm px-2 py-1 rounded',
                  isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                ]">{{ metric.weight }}%</span>
              </div>
              <p :class="[
                'text-sm mb-3',
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              ]">{{ metric.description }}</p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div :class="[
                  'p-2 rounded',
                  isDarkMode ? 'bg-green-900/30 text-green-200' : 'bg-green-100 text-green-800'
                ]">
                  <div class="font-semibold">Good</div>
                  <div>{{ metric.thresholds.good }}</div>
                </div>
                <div :class="[
                  'p-2 rounded',
                  isDarkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                ]">
                  <div class="font-semibold">Needs Improvement</div>
                  <div>{{ metric.thresholds.needsImprovement }}</div>
                </div>
                <div :class="[
                  'p-2 rounded',
                  isDarkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-800'
                ]">
                  <div class="font-semibold">Poor</div>
                  <div>{{ metric.thresholds.poor }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Interactive Score Calculator -->
    <div :class="[
      'rounded-lg shadow-sm border p-8',
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    ]">
      <h2 :class="[
        'text-2xl font-bold mb-6',
        isDarkMode ? 'text-white' : 'text-gray-900'
      ]">Interactive Score Calculator</h2>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 :class="[
            'text-lg font-semibold mb-4',
            isDarkMode ? 'text-white' : 'text-gray-900'
          ]">Adjust Performance Metrics</h3>

          <div class="space-y-4">
            <div v-for="metric in interactiveMetrics" :key="metric.key">
              <label :class="[
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              ]">{{ metric.name }} ({{ metric.value }}{{ metric.unit }})</label>
              <input
                type="range"
                :min="metric.min"
                :max="metric.max"
                :step="metric.step"
                v-model="metric.value"
                :class="[
                  'w-full h-2 rounded-lg appearance-none cursor-pointer',
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                ]"
              />
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>{{ metric.min }}{{ metric.unit }}</span>
                <span>{{ metric.max }}{{ metric.unit }}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 :class="[
            'text-lg font-semibold mb-4',
            isDarkMode ? 'text-white' : 'text-gray-900'
          ]">Calculated Score</h3>

          <div :class="[
            'p-6 rounded-lg text-center',
            isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
          ]">
            <div :class="[
              'text-6xl font-bold mb-2',
              calculatedScore >= 90 ? 'text-green-500' :
              calculatedScore >= 50 ? 'text-yellow-500' : 'text-red-500'
            ]">{{ calculatedScore }}</div>
            <div :class="[
              'text-lg font-medium mb-4',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            ]">Performance Score</div>
            <div :class="[
              'inline-block px-4 py-2 rounded-full text-sm font-medium',
              calculatedScore >= 90 ? 'bg-green-100 text-green-800' :
              calculatedScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
            ]">
              {{ calculatedScore >= 90 ? 'Good' : calculatedScore >= 50 ? 'Needs Improvement' : 'Poor' }}
            </div>
          </div>

          <div class="mt-6 space-y-3">
            <div v-for="metric in interactiveMetrics" :key="metric.key" class="flex justify-between items-center">
              <span :class="[
                'text-sm',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              ]">{{ metric.name }}</span>
              <span :class="[
                'text-sm font-medium',
                isDarkMode ? 'text-gray-200' : 'text-gray-900'
              ]">{{ getMetricScore(metric) }}/100</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Best Practices Section -->
    <div :class="[
      'rounded-lg shadow-sm border p-8',
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    ]">
      <h2 :class="[
        'text-2xl font-bold mb-6',
        isDarkMode ? 'text-white' : 'text-gray-900'
      ]">Optimization Best Practices</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="practice in bestPractices" :key="practice.category" :class="[
          'p-6 rounded-lg border',
          isDarkMode ? 'border-gray-600' : 'border-gray-200'
        ]">
          <div class="flex items-center mb-4">
            <div :class="[
              'w-10 h-10 rounded-full flex items-center justify-center mr-3',
              `bg-${practice.color}-500`
            ]">
              <i :class="`pi ${practice.icon} text-white`"></i>
            </div>
            <h3 :class="[
              'text-lg font-semibold',
              isDarkMode ? 'text-white' : 'text-gray-900'
            ]">{{ practice.category }}</h3>
          </div>
          <ul class="space-y-2">
            <li v-for="tip in practice.tips" :key="tip" :class="[
              'text-sm flex items-start',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            ]">
              <i class="pi pi-check text-green-500 mr-2 mt-0.5 text-xs"></i>
              {{ tip }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed } from 'vue'

const isDarkMode = inject('isDarkMode', ref(false))
const selectedCategory = ref('performance')

const stats = [
  { value: '4', label: 'Core Categories', color: 'text-blue-500' },
  { value: '6', label: 'Key Metrics', color: 'text-green-500' },
  { value: '100', label: 'Max Score', color: 'text-purple-500' },
  { value: '90+', label: 'Good Score', color: 'text-orange-500' }
]

const categories = [
  {
    key: 'performance',
    name: 'Performance',
    weight: 100,
    color: 'blue',
    icon: 'pi-bolt',
    description: 'Measures how fast your page loads and becomes interactive. Based on Core Web Vitals and other key metrics.',
    metrics: ['First Contentful Paint', 'Largest Contentful Paint', 'Speed Index', 'Total Blocking Time', 'Cumulative Layout Shift']
  },
  {
    key: 'accessibility',
    name: 'Accessibility',
    weight: 100,
    color: 'green',
    icon: 'pi-eye',
    description: 'Evaluates how accessible your site is to users with disabilities and assistive technologies.',
    metrics: ['Color Contrast', 'Alt Text', 'ARIA Labels', 'Keyboard Navigation', 'Focus Management']
  },
  {
    key: 'best-practices',
    name: 'Best Practices',
    weight: 100,
    color: 'purple',
    icon: 'pi-shield',
    description: 'Checks for modern web development best practices and common pitfalls.',
    metrics: ['HTTPS Usage', 'Console Errors', 'Deprecated APIs', 'Security Issues', 'Browser Compatibility']
  },
  {
    key: 'seo',
    name: 'SEO',
    weight: 100,
    color: 'orange',
    icon: 'pi-search',
    description: 'Analyzes how well your page is optimized for search engine results.',
    metrics: ['Meta Tags', 'Structured Data', 'Mobile Friendly', 'Crawlability', 'Content Quality']
  }
]

const scoreRanges = [
  {
    label: 'Good',
    range: '90-100',
    color: 'green',
    description: 'Fast and optimized'
  },
  {
    label: 'Needs Improvement',
    range: '50-89',
    color: 'yellow',
    description: 'Some optimization needed'
  },
  {
    label: 'Poor',
    range: '0-49',
    color: 'red',
    description: 'Significant issues present'
  }
]

const performanceMetrics = [
  {
    name: 'First Contentful Paint (FCP)',
    weight: 10,
    description: 'Time when the first content appears on screen',
    thresholds: {
      good: '≤ 1.8s',
      needsImprovement: '1.8s - 3.0s',
      poor: '> 3.0s'
    }
  },
  {
    name: 'Largest Contentful Paint (LCP)',
    weight: 25,
    description: 'Time when the largest content element appears',
    thresholds: {
      good: '≤ 2.5s',
      needsImprovement: '2.5s - 4.0s',
      poor: '> 4.0s'
    }
  },
  {
    name: 'Speed Index',
    weight: 10,
    description: 'How quickly content is visually displayed',
    thresholds: {
      good: '≤ 3.4s',
      needsImprovement: '3.4s - 5.8s',
      poor: '> 5.8s'
    }
  },
  {
    name: 'Total Blocking Time (TBT)',
    weight: 30,
    description: 'Time when the main thread is blocked',
    thresholds: {
      good: '≤ 200ms',
      needsImprovement: '200ms - 600ms',
      poor: '> 600ms'
    }
  },
  {
    name: 'Cumulative Layout Shift (CLS)',
    weight: 25,
    description: 'Visual stability of the page',
    thresholds: {
      good: '≤ 0.1',
      needsImprovement: '0.1 - 0.25',
      poor: '> 0.25'
    }
  }
]

const interactiveMetrics = ref([
  { key: 'fcp', name: 'First Contentful Paint', value: 1800, min: 500, max: 5000, step: 100, unit: 'ms' },
  { key: 'lcp', name: 'Largest Contentful Paint', value: 2500, min: 1000, max: 8000, step: 100, unit: 'ms' },
  { key: 'si', name: 'Speed Index', value: 3400, min: 1000, max: 10000, step: 100, unit: 'ms' },
  { key: 'tbt', name: 'Total Blocking Time', value: 200, min: 0, max: 1000, step: 10, unit: 'ms' },
  { key: 'cls', name: 'Cumulative Layout Shift', value: 0.1, min: 0, max: 0.5, step: 0.01, unit: '' }
])

const calculatedScore = computed(() => {
  const fcpScore = getMetricScore(interactiveMetrics.value[0])
  const lcpScore = getMetricScore(interactiveMetrics.value[1])
  const siScore = getMetricScore(interactiveMetrics.value[2])
  const tbtScore = getMetricScore(interactiveMetrics.value[3])
  const clsScore = getMetricScore(interactiveMetrics.value[4])

  // Weighted average based on Lighthouse v11 weights
  const weighted = (fcpScore * 0.1) + (lcpScore * 0.25) + (siScore * 0.1) + (tbtScore * 0.3) + (clsScore * 0.25)
  return Math.round(weighted)
})

const getMetricScore = (metric) => {
  const value = parseFloat(metric.value)

  switch (metric.key) {
    case 'fcp':
      if (value <= 1800) return 100
      if (value <= 3000) return Math.round(100 - ((value - 1800) / 1200) * 50)
      return Math.max(0, Math.round(50 - ((value - 3000) / 2000) * 50))

    case 'lcp':
      if (value <= 2500) return 100
      if (value <= 4000) return Math.round(100 - ((value - 2500) / 1500) * 50)
      return Math.max(0, Math.round(50 - ((value - 4000) / 4000) * 50))

    case 'si':
      if (value <= 3400) return 100
      if (value <= 5800) return Math.round(100 - ((value - 3400) / 2400) * 50)
      return Math.max(0, Math.round(50 - ((value - 5800) / 4200) * 50))

    case 'tbt':
      if (value <= 200) return 100
      if (value <= 600) return Math.round(100 - ((value - 200) / 400) * 50)
      return Math.max(0, Math.round(50 - ((value - 600) / 400) * 50))

    case 'cls':
      if (value <= 0.1) return 100
      if (value <= 0.25) return Math.round(100 - ((value - 0.1) / 0.15) * 50)
      return Math.max(0, Math.round(50 - ((value - 0.25) / 0.25) * 50))

    default:
      return 50
  }
}

const bestPractices = [
  {
    category: 'Performance',
    color: 'blue',
    icon: 'pi-bolt',
    tips: [
      'Optimize images and use modern formats (WebP, AVIF)',
      'Minimize and compress CSS and JavaScript',
      'Use a Content Delivery Network (CDN)',
      'Enable browser caching',
      'Lazy load images and content below the fold'
    ]
  },
  {
    category: 'Accessibility',
    color: 'green',
    icon: 'pi-eye',
    tips: [
      'Provide alt text for all images',
      'Ensure sufficient color contrast ratios',
      'Use semantic HTML elements',
      'Implement proper focus management',
      'Test with screen readers'
    ]
  },
  {
    category: 'Best Practices',
    color: 'purple',
    icon: 'pi-shield',
    tips: [
      'Use HTTPS everywhere',
      'Avoid deprecated JavaScript APIs',
      'Fix console errors and warnings',
      'Implement proper error boundaries',
      'Keep dependencies up to date'
    ]
  },
  {
    category: 'SEO',
    color: 'orange',
    icon: 'pi-search',
    tips: [
      'Include meta descriptions and title tags',
      'Use structured data markup',
      'Ensure mobile-friendly design',
      'Create an XML sitemap',
      'Optimize for Core Web Vitals'
    ]
  }
]
</script>

<style scoped>
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.bg-gray-750 {
  background-color: #374151;
}
</style>
