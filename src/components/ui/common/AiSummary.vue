<template>
  <div>
    <p
      :class="[
        'rounded-lg p-4 text-base leading-relaxed transition-colors',
        isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800 shadow-sm border border-gray-200'
      ]"
      v-html="formattedSummary"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  scores: Object,
  allRunsData: Array,
  opportunities: Array,
  isDarkMode: Boolean,
  compareTables: {
    type: Boolean,
    default: false
  }
})

import { ref, onMounted } from 'vue'

const summary = ref('');

// 1️⃣ Turn “\n” into real <br> tags
const formattedSummary = computed(() =>
  summary.value
    .split('\n')
    .map(line => `<p>${line}</p>`)
    .join('')
);

async function fetchSummary() {
  try {
    const body = props.compareTables ?
      {
        allRunsData: props.allRunsData,
        tableComparison: true
      } :
      {
        coreMetrics: props.allRunsData,
        opportunities: props.opportunities,
        scores: props.scores,
        tableComparison: false
      }
    const res = await fetch('/api/ai-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const { summary: text } = await res.json();
      summary.value = text;
      console.log('AI Response:', summary.value);
    }
  } catch (e) {
    console.error('Failed to get summary', e);
  }
}

onMounted(async () => {
  if (props.allRunsData.length > 0) {
    setTimeout(async () => {
      await fetchSummary();
    }, 5000);
  }
});
</script>
