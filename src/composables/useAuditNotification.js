import { ref, onUnmounted } from 'vue'

export function useAuditNotification() {
  const visible = ref(false)
  let dismissTimer = null

  const clearTimer = () => {
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
  }

  const startDismissTimer = () => {
    clearTimer()
    dismissTimer = setTimeout(dismiss, 2000)
  }

  const onVisibilityChange = () => {
    if (!visible.value) return
    if (document.visibilityState === 'visible') {
      startDismissTimer()
    } else {
      // Tab hidden — pause the timer; will restart when tab becomes visible again
      clearTimer()
    }
  }

  const show = () => {
    clearTimer()
    // Remove first to avoid duplicate listeners if show() is called again
    document.removeEventListener('visibilitychange', onVisibilityChange)
    visible.value = true
    document.addEventListener('visibilitychange', onVisibilityChange)
    if (document.visibilityState === 'visible') {
      startDismissTimer()
    }
    // If tab is hidden, the timer is held until visibilitychange fires
  }

  function dismiss() {
    clearTimer()
    visible.value = false
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }

  onUnmounted(() => {
    clearTimer()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { visible, show, dismiss }
}
