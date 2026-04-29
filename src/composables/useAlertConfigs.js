import { ref } from 'vue'

export function useAlertConfigs() {
  const configs = ref([])
  const loading = ref(false)
  const error = ref(null)

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('lh_token')}`,
  })

  const fetchAlerts = async (targetId) => {
    loading.value = true
    error.value = null
    try {
      const params = targetId ? `?target_id=${targetId}` : ''
      const res = await fetch(`/api/alerts${params}`, { headers: authHeaders() })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to load alerts')
      configs.value = body.configs ?? []
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const createAlert = async ({ target_id, metric, threshold, comparison }) => {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ target_id, metric, threshold: Number(threshold), comparison }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Failed to create alert')
    configs.value = [body.config, ...configs.value]
    return body.config
  }

  const updateAlert = async (id, patch) => {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Failed to update alert')
    const idx = configs.value.findIndex(c => c.id === id)
    if (idx >= 0) configs.value[idx] = body.config
    return body.config
  }

  const deleteAlert = async (id) => {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Failed to delete alert')
    configs.value = configs.value.filter(c => c.id !== id)
  }

  return { configs, loading, error, fetchAlerts, createAlert, updateAlert, deleteAlert }
}
