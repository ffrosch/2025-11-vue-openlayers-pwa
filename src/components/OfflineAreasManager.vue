<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDownloadedAreas } from '@/composables/useDownloadedAreas'
import { useStorageQuota } from '@/composables/useStorageQuota'
import type { DownloadedArea } from '@/types'

const emit = defineEmits<{
  (e: 'viewOnMap', bbox: { west: number; south: number; east: number; north: number }): void
  (e: 'close'): void
}>()

const { getAllAreas, deleteArea, getTotalStorageUsed } = useDownloadedAreas()
const { storageInfo, updateStorageInfo, formatBytes } = useStorageQuota()

const areas = ref<DownloadedArea[]>([])
const totalStorage = ref(0)
const showDeleteConfirm = ref(false)
const areaToDelete = ref<DownloadedArea | null>(null)
const isDeleting = ref(false)

onMounted(async () => {
  await loadAreas()
  await updateStorageInfo()
})

async function loadAreas() {
  areas.value = await getAllAreas()
  totalStorage.value = await getTotalStorageUsed()
}

const storagePercentage = computed(() => {
  if (storageInfo.value.quota === 0) return 0
  return Math.round((totalStorage.value / storageInfo.value.quota) * 100)
})

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function handleViewOnMap(area: DownloadedArea) {
  emit('viewOnMap', area.bbox)
}

function confirmDelete(area: DownloadedArea) {
  areaToDelete.value = area
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
  areaToDelete.value = null
}

async function handleDelete() {
  if (!areaToDelete.value) return

  isDeleting.value = true
  try {
    await deleteArea(areaToDelete.value.id)
    await loadAreas()
    await updateStorageInfo()
  } finally {
    isDeleting.value = false
    showDeleteConfirm.value = false
    areaToDelete.value = null
  }
}
</script>

<template>
  <div class="areas-manager">
    <div class="header">
      <h2>Downloaded Areas</h2>
      <button @click="$emit('close')" class="close-button">&times;</button>
    </div>

    <div class="content">
      <div v-if="areas.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <p class="empty-title">No Downloaded Areas</p>
        <p class="empty-text">Download map areas for offline use from the map view.</p>
      </div>

      <div v-else class="areas-list">
        <div v-for="area in areas" :key="area.id" class="area-card">
          <div class="area-header">
            <div class="area-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div class="area-title">
              <h3>{{ area.name }}</h3>
              <p class="area-date">{{ formatDate(area.downloadedAt) }}</p>
            </div>
          </div>

          <div class="area-details">
            <div class="detail-row">
              <span class="detail-label">Zoom levels:</span>
              <span class="detail-value">{{ area.minZoom }}-{{ area.maxZoom }} ({{ area.additionalZoomLevels + 1 }} levels)</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tiles:</span>
              <span class="detail-value">{{ area.tileCount.toLocaleString() }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Size:</span>
              <span class="detail-value">{{ formatBytes(area.sizeBytes) }}</span>
            </div>
          </div>

          <div class="area-actions">
            <button @click="handleViewOnMap(area)" class="button button-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
              </svg>
              View on Map
            </button>
            <button @click="confirmDelete(area)" class="button button-danger">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="areas.length > 0" class="footer">
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Areas:</span>
          <span class="summary-value">{{ areas.length }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Size:</span>
          <span class="summary-value">{{ formatBytes(totalStorage) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Storage Used:</span>
          <span class="summary-value">{{ storagePercentage }}%</span>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="cancelDelete">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>Delete Area?</h3>
        </div>
        <div class="dialog-body">
          <p>Are you sure you want to delete <strong>{{ areaToDelete?.name }}</strong>?</p>
          <p class="warning-text">This will remove {{ areaToDelete?.tileCount.toLocaleString() }} tiles ({{ formatBytes(areaToDelete?.sizeBytes || 0) }}) and cannot be undone.</p>
        </div>
        <div class="dialog-footer">
          <button @click="cancelDelete" class="button button-secondary" :disabled="isDeleting">
            Cancel
          </button>
          <button @click="handleDelete" class="button button-danger" :disabled="isDeleting">
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.areas-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
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

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
}

.empty-state svg {
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-text {
  margin: 0;
  font-size: 0.875rem;
}

.areas-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.area-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: box-shadow 0.2s;
}

.area-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.area-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.area-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  flex-shrink: 0;
}

.area-title h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.area-date {
  margin: 4px 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.area-details {
  margin-bottom: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.875rem;
}

.detail-label {
  color: #6b7280;
}

.detail-value {
  font-weight: 600;
  color: #111827;
}

.area-actions {
  display: flex;
  gap: 8px;
}

.button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.875rem;
}

.button-secondary {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.button-secondary:hover {
  background-color: #f9fafb;
}

.button-danger {
  background-color: white;
  color: #dc2626;
  border: 1px solid #dc2626;
}

.button-danger:hover:not(:disabled) {
  background-color: #fee2e2;
}

.button-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.footer {
  border-top: 1px solid #e5e7eb;
  padding: 20px;
  background: #f9fafb;
}

.summary {
  display: flex;
  justify-content: space-around;
  gap: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
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
  z-index: 4000;
  padding: 20px;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.dialog-body {
  padding: 20px;
}

.dialog-body p {
  margin: 0 0 12px 0;
  color: #374151;
}

.warning-text {
  font-size: 0.875rem;
  color: #dc2626;
  background: #fee2e2;
  padding: 8px 12px;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}
</style>
