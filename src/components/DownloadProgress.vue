<script setup lang="ts">
import { computed } from 'vue'
import type { DownloadProgress } from '@/types'
import { formatBytes } from '@/utils/format'

interface Props {
  progress: DownloadProgress
  show: boolean
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'cancel'): void
}>()

const formatTime = (seconds: number | undefined): string => {
  if (!seconds) return 'Calculating...'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

const downloadSpeed = computed(() => {
  if (!props.progress.startTime || props.progress.downloaded === 0 || props.progress.bytesDownloaded === 0) {
    return 'Calculating...'
  }
  const elapsed = (Date.now() - props.progress.startTime) / 1000 // seconds
  if (elapsed <= 0) return 'Calculating...'

  const bytesPerSecond = props.progress.bytesDownloaded / elapsed
  return `${formatBytes(bytesPerSecond)}/s`
})

const statusText = computed(() => {
  if (props.progress.isCancelled) return 'Download cancelled'
  if (props.progress.isComplete) return 'Download complete!'
  return `Downloading tile ${props.progress.downloaded + props.progress.failed} of ${props.progress.total}`
})
</script>

<template>
  <div v-if="show" class="progress-overlay">
    <div class="progress-container">
      <div class="progress-header">
        <h2>{{ statusText }}</h2>
      </div>

      <div class="progress-body">
        <!-- Progress Ring -->
        <div class="progress-ring-container">
          <svg class="progress-ring" width="120" height="120">
            <circle
              class="progress-ring-circle-bg"
              cx="60"
              cy="60"
              r="52"
              stroke-width="8"
            />
            <circle
              class="progress-ring-circle"
              cx="60"
              cy="60"
              r="52"
              stroke-width="8"
              :stroke-dasharray="`${2 * Math.PI * 52}`"
              :stroke-dashoffset="`${2 * Math.PI * 52 * (1 - progress.percentage / 100)}`"
            />
          </svg>
          <div class="progress-percentage">{{ progress.percentage }}%</div>
        </div>

        <!-- Stats -->
        <div class="stats-container">
          <div class="stat-row">
            <span class="stat-label">Downloaded:</span>
            <span class="stat-value">{{ progress.downloaded }} / {{ progress.total }}</span>
          </div>
          <div v-if="progress.failed > 0" class="stat-row">
            <span class="stat-label">Failed:</span>
            <span class="stat-value error">{{ progress.failed }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Size:</span>
            <span class="stat-value">{{ formatBytes(progress.bytesDownloaded) }}</span>
          </div>
          <div v-if="!progress.isComplete && !progress.isCancelled" class="stat-row">
            <span class="stat-label">Speed:</span>
            <span class="stat-value">{{ downloadSpeed }}</span>
          </div>
          <div v-if="!progress.isComplete && !progress.isCancelled" class="stat-row">
            <span class="stat-label">ETA:</span>
            <span class="stat-value">{{ formatTime(progress.estimatedTimeRemaining) }}</span>
          </div>
        </div>
      </div>

      <div class="progress-footer">
        <button
          v-if="!progress.isComplete && !progress.isCancelled"
          @click="$emit('cancel')"
          class="button button-cancel"
        >
          Cancel
        </button>
        <button
          v-if="progress.isComplete || progress.isCancelled"
          @click="$emit('cancel')"
          class="button button-primary"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}

.progress-container {
  background: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.progress-header {
  padding: 24px;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
}

.progress-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.progress-body {
  padding: 32px 24px;
}

.progress-ring-container {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-circle-bg {
  fill: none;
  stroke: #e5e7eb;
}

.progress-ring-circle {
  fill: none;
  stroke: #3b82f6;
  transition: stroke-dashoffset 0.3s ease;
}

.progress-percentage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.stats-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.stat-value {
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
}

.stat-value.error {
  color: #dc2626;
}

.progress-footer {
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
}

.button {
  padding: 0.625rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.button-cancel {
  background-color: white;
  color: #dc2626;
  border: 1px solid #dc2626;
}

.button-cancel:hover {
  background-color: #fee2e2;
}

.button-primary {
  background-color: #3b82f6;
  color: white;
}

.button-primary:hover {
  background-color: #2563eb;
}
</style>
