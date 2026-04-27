import { ref } from 'vue'

export function useAuditHistory() {
  const runs = ref([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const loading = ref(false)
  const error = ref(null)

  const fetchHistory = async ({ page: p = 1, limit: l = 20, url = null } = {}) => {
    loading.value = true
    error.value = null
    try {
      const token = localStorage.getItem('lh_token')
      const params = new URLSearchParams({ page: p, limit: l })
      if (url) params.set('url', url)
      const res = await fetch(`/api/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || (res.status === 401 ? 'Unauthorized' : 'Failed to load history'))
      }
      const data = await res.json()
      runs.value = data.runs
      total.value = data.total
      page.value = data.page
      limit.value = data.limit
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return { runs, total, page, limit, loading, error, fetchHistory }
}
