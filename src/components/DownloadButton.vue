<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { BoundingBox } from '@/types'
import { useOfflineTiles } from '@/composables/useOfflineTiles'
import { useStorageQuota } from '@/composables/useStorageQuota'
import { formatBytes } from '@/utils/format'

interface Props {
  currentExtent: BoundingBox | null
  currentZoom: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'startDownload', payload: { bbox: BoundingBox; name: string; baseZoom: number; additionalLevels: number }): void
}>()

const showDialog = ref(false)
const areaName = ref('')
const additionalZoomLevels = ref(2)

const { calculateDownloadEstimate } = useOfflineTiles()
const { storageInfo, updateStorageInfo } = useStorageQuota()

const estimate = computed(() => {
  if (!props.currentExtent) return null
  return calculateDownloadEstimate(props.currentExtent, props.currentZoom, additionalZoomLevels.value)
})

const estimatedSizeMB = computed(() => {
  if (!estimate.value) return '0'
  return (estimate.value.estimatedSizeBytes / (1024 * 1024)).toFixed(2)
})

const estimatedSizeBytes = computed(() => {
  return estimate.value?.estimatedSizeBytes || 0
})

const hasEnoughStorage = computed(() => {
  return storageInfo.value.available >= estimatedSizeBytes.value
})

const storageWarning = computed(() => {
  if (!estimate.value) return null
  if (!hasEnoughStorage.value) {
    const requiredMB = (estimatedSizeBytes.value / (1024 * 1024)).toFixed(2)
    const availableMB = (storageInfo.value.available / (1024 * 1024)).toFixed(2)
    return `Insufficient storage: need ${requiredMB} MB, only ${availableMB} MB available`
  }
  return null
})

async function openDialog() {
  if (!props.currentExtent) return

  // Update storage info when dialog opens
  await updateStorageInfo()

  // Auto-fill area name with date/location
  const date = new Date().toLocaleDateString()
  areaName.value = `Downloaded ${date}`

  showDialog.value = true
}

onMounted(() => {
  updateStorageInfo()
})

function closeDialog() {
  showDialog.value = false
}

function startDownload() {
  if (!props.currentExtent) return

  emit('startDownload', {
    bbox: props.currentExtent,
    name: areaName.value,
    baseZoom: props.currentZoom,
    additionalLevels: additionalZoomLevels.value,
  })

  closeDialog()
}
</script>

<template>
  <div>
    <!-- Floating Action Button -->
    <button
      class="download-fab"
      @click="openDialog"
      :disabled="!currentExtent"
      title="Download map for offline use"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    </button>

    <!-- Download Dialog -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h2 class="text-slate-900">Download Map for Offline Use</h2>
          <button @click="closeDialog" class="close-button">&times;</button>
        </div>

        <div class="dialog-body">
          <div class="form-group">
            <label for="area-name">Area Name</label>
            <input
              id="area-name"
              v-model="areaName"
              type="text"
              placeholder="Enter area name"
              class="text-input text-slate-900"
            />
          </div>

          <div class="form-group">
            <label>Current Zoom Level: {{ currentZoom }}</label>
          </div>

          <div class="form-group">
            <label for="zoom-slider">
              Additional Zoom Levels: {{ additionalZoomLevels }}
              <span class="zoom-range">({{ estimate?.minZoom }} - {{ estimate?.maxZoom }})</span>
            </label>
            <input
              id="zoom-slider"
              v-model.number="additionalZoomLevels"
              type="range"
              min="0"
              max="5"
              step="1"
              class="slider"
            />
          </div>

          <div v-if="storageWarning" class="warning storage-warning">
            ⚠️ {{ storageWarning }}
          </div>

          <div class="stats">
            <div class="stat-item">
              <span class="stat-label">Tiles to download:</span>
              <span class="stat-value">{{ estimate?.tileCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Estimated size:</span>
              <span class="stat-value">{{ estimatedSizeMB }} MB</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Available storage:</span>
              <span class="stat-value">{{ formatBytes(storageInfo.available) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total quota:</span>
              <span class="stat-value">{{ formatBytes(storageInfo.quota) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Currently used:</span>
              <span class="stat-value">{{ formatBytes(storageInfo.usage) }} ({{ storageInfo.percentUsed.toFixed(1) }}%)</span>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button @click="closeDialog" class="button button-secondary">Cancel</button>
          <button
            @click="startDownload"
            class="button button-primary"
            :disabled="!areaName || !hasEnoughStorage"
          >
            Start Download
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.download-fab {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #3b82f6;
  color: white;
  border: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 1000;
}

.download-fab:hover:not(:disabled) {
  background-color: #2563eb;
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.download-fab:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
}

.close-button:hover {
  color: #374151;
}

.dialog-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.zoom-range {
  font-weight: normal;
  color: #6b7280;
  font-size: 0.875rem;
}

.text-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.text-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #d1d5db;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

.warning {
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.storage-warning {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.stats {
  background-color: #f9fafb;
  border-radius: 6px;
  padding: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.stat-label {
  color: #6b7280;
}

.stat-value {
  font-weight: 600;
  color: #111827;
}

.dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.button-secondary {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.button-secondary:hover {
  background-color: #f9fafb;
}

.button-primary {
  background-color: #3b82f6;
  color: white;
}

.button-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.button-primary:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
</style>
