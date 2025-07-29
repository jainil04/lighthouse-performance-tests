import { ref } from 'vue'
import { streamLighthouseAudit } from '../utils/lighthouseApi.js'

export function useLighthouseAudit() {
  const isRunning = ref(false)
  const progress = ref(0)
  const currentStage = ref('')
  const currentMessage = ref('')
  const auditError = ref(null)
  const auditResults = ref(null)

  // Track total runs for progress calculation
  const totalRuns = ref(1)
  const completedRuns = ref(0)

  const scores = ref({
    performance: null,
    accessibility: null,
    bestPractices: null,
    seo: null
  })

  const detailedMetrics = ref({})
  const opportunities = ref({})
  const diagnostics = ref({})
  const allRunsData = ref([])

  const calculateProgress = (currentRunProgress, currentRun, total) => {
    // Each run contributes (100 / totalRuns) percent to the total progress
    const progressPerRun = 100 / total

    // Progress from completed runs
    const completedProgress = (currentRun - 1) * progressPerRun

    // Progress from current run
    const currentRunContribution = (currentRunProgress / 100) * progressPerRun

    return Math.round(completedProgress + currentRunContribution)
  }

  const handleProgressUpdate = (data) => {
    console.log('Frontend received progress update:', data)

    // Store total runs for progress calculation
    if (data.totalRuns) {
      totalRuns.value = data.totalRuns
    }

    // Calculate new progress based on runs and individual run progress
    let newProgress = 0
    if (data.currentRun && data.totalRuns) {
      const runProgress = data.progress || 0
      newProgress = calculateProgress(runProgress, data.currentRun, data.totalRuns)
    } else {
      newProgress = data.progress || 0
    }

    // Only update progress if it's higher than current progress (monotonic increase)
    if (newProgress > progress.value) {
      progress.value = newProgress
    }

    currentMessage.value = data.message || ''
    currentStage.value = data.stage || ''

    console.log(`Progress: ${progress.value}%, Message: ${currentMessage.value}, Stage: ${currentStage.value}`)

    switch (data.type) {
      case 'start':
        console.log('Audit started:', data.message)
        completedRuns.value = 0
        progress.value = 0 // Reset to 0 at start
        break

      case 'progress':
        console.log(`Progress: ${progress.value}% - ${data.message}`)
        // Progress updates handled above with monotonic increase
        break

      case 'run-complete':
        console.log(`Run ${data.currentRun}/${data.totalRuns} completed`)
        completedRuns.value = data.currentRun

        // Ensure run completion shows proper progress for that run
        const runCompleteProgress = calculateProgress(100, data.currentRun, data.totalRuns)
        if (runCompleteProgress > progress.value) {
          progress.value = runCompleteProgress
        }

        // Update scores with latest run results
        if (data.runResult && data.runResult.scores) {
          scores.value = { ...data.runResult.scores }
          console.log('Updated scores from run-complete:', scores.value);
        }
        // Update detailed metrics
        if (data.runResult && data.runResult.metrics) {
          detailedMetrics.value = { ...data.runResult.metrics }

          // Add run data to table
          const runData = {
            run: data.currentRun,
            fcp: data.runResult.metrics.firstContentfulPaint,
            lcp: data.runResult.metrics.largestContentfulPaint,
            tti: data.runResult.metrics.timeToInteractive,
            cls: data.runResult.metrics.cumulativeLayoutShift,
            si: data.runResult.metrics.speedIndex,
            tbt: data.runResult.metrics.totalBlockingTime,
            srt: data.runResult.metrics.serverResponseTime
          }
          allRunsData.value.push(runData)
        }
        // Update opportunities and diagnostics
        if (data.runResult && data.runResult.opportunities) {
          opportunities.value = { ...data.runResult.opportunities }
        }
        if (data.runResult && data.runResult.diagnostics) {
          diagnostics.value = { ...data.runResult.diagnostics }
        }
        break

      case 'complete':
        console.log('Audit completed!', data.data)
        auditResults.value = data.data
        progress.value = 100 // Ensure progress is 100% when completely done

        // Update final scores and metrics
        if (data.data) {
          if (data.data.run && data.data.run.scores) {
            // Single run
            scores.value = { ...data.data.run.scores }
            console.log('Final scores (single run):', scores.value);
            if (data.data.run.metrics) {
              detailedMetrics.value = { ...data.data.run.metrics }
            }
            if (data.data.run.opportunities) {
              opportunities.value = { ...data.data.run.opportunities }
            }
            if (data.data.run.diagnostics) {
              diagnostics.value = { ...data.data.run.diagnostics }
            }
          } else if (data.data.averages && data.data.averages.scores) {
            // Multiple runs - use averages
            scores.value = { ...data.data.averages.scores }
            console.log('Final scores (averages):', scores.value);
            if (data.data.averages.metrics) {
              detailedMetrics.value = { ...data.data.averages.metrics }
            }
            if (data.data.averages.opportunities) {
              opportunities.value = { ...data.data.averages.opportunities }
            }
            if (data.data.averages.diagnostics) {
              diagnostics.value = { ...data.data.averages.diagnostics }
            }
          }
        }
        break

      case 'error':
        console.error('Audit error:', data?.message)
        auditError.value = data?.message
        break
    }
  }

  const runAudit = async (auditConfig) => {
    if (isRunning.value) return

    // Reset state
    isRunning.value = true
    progress.value = 0
    currentStage.value = ''
    currentMessage.value = ''
    auditError.value = null
    auditResults.value = null
    completedRuns.value = 0
    totalRuns.value = auditConfig.runs || 1

    // Reset scores and metrics
    scores.value = {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null
    }
    detailedMetrics.value = {}
    opportunities.value = {}
    diagnostics.value = {}
    allRunsData.value = []

    console.log('Starting Lighthouse audit:', auditConfig)

    // Dispatch audit start event for sidebar to close on desktop
    window.dispatchEvent(new CustomEvent('audit-start'))

    try {
      await streamLighthouseAudit(auditConfig, handleProgressUpdate)
    } catch (error) {
      console.error('Audit failed:', error)
      auditError.value = error.message
    } finally {
      isRunning.value = false
    }
  }

  return {
    // State
    isRunning,
    progress,
    currentStage,
    currentMessage,
    auditError,
    auditResults,
    scores,
    detailedMetrics,
    opportunities,
    diagnostics,
    allRunsData,

    // Methods
    runAudit,
    handleProgressUpdate
  }
}
