<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MapComponent from '@/components/MapComponent.vue'
import DownloadButton from '@/components/DownloadButton.vue'
import DownloadProgress from '@/components/DownloadProgress.vue'
import StoragePersistenceIndicator from '@/components/StoragePersistenceIndicator.vue'
import type { MapConfig, BoundingBox } from '@/types'
import { useOfflineTiles } from '@/composables/useOfflineTiles'
import { useAreasOverlay } from '@/composables/useAreasOverlay'
import type Map from 'ol/Map'

const router = useRouter()

// Baden-Württemberg coordinates: approximately 48.6616°N, 9.3501°E
// Zoom level 8 provides a good overview of the state
const mapConfig: MapConfig = {
  center: [9.3501, 48.6616], // [longitude, latitude]
  zoom: 8
}

const mapInstance = ref<Map | null>(null)
const currentExtent = ref<BoundingBox | null>(null)
const currentZoom = ref(mapConfig.zoom)
const showProgress = ref(false)

const { downloadArea, downloadProgress, cancelDownload, getCurrentMapExtent } = useOfflineTiles()
const { isVisible: areasVisible, initializeLayer, toggleVisibility, updateAreasForZoom, refreshAreas } = useAreasOverlay()

async function handleMapReady(map: Map) {
  mapInstance.value = map

  // Get initial zoom and extent
  currentExtent.value = getCurrentMapExtent(map as Map)
  const zoom = map.getView().getZoom()
  const roundedZoom = zoom ? Math.round(zoom) : mapConfig.zoom
  currentZoom.value = roundedZoom

  // Initialize overlay with zoom filter applied
  await initializeLayer(map, roundedZoom)
}

async function handleMoveEnd({ map }: { map: Map }) {
  mapInstance.value = map
  await updateMapInfo()
}

async function updateMapInfo() {
  if (!mapInstance.value) return

  currentExtent.value = getCurrentMapExtent(mapInstance.value as Map)
  const zoom = mapInstance.value.getView().getZoom()
  const roundedZoom = zoom ? Math.round(zoom) : mapConfig.zoom

  // Update overlay if zoom changed
  if (currentZoom.value !== roundedZoom) {
    currentZoom.value = roundedZoom
    await updateAreasForZoom(roundedZoom)
  }
}

async function handleStartDownload(payload: { bbox: BoundingBox; name: string; baseZoom: number; additionalLevels: number }) {
  showProgress.value = true
  try {
    await downloadArea(
      payload.bbox,
      payload.name,
      payload.baseZoom,
      payload.additionalLevels,
      () => {
        // Progress updates are automatically tracked in downloadProgress ref
      }
    )
    // Refresh areas overlay after successful download
    await refreshAreas()
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient storage')) {
      alert(`Download failed: ${error.message}`)
      showProgress.value = false
    } else {
      throw error
    }
  }
}

function handleCancelDownload() {
  if (!downloadProgress.value.isComplete && !downloadProgress.value.isCancelled) {
    cancelDownload()
  } else {
    showProgress.value = false
  }
}

function openAreasManager() {
  router.push({ name: 'offline-areas' })
}
</script>

<template>
  <div class="map-view">
    <MapComponent
      :config="mapConfig"
      @map-ready="handleMapReady"
      @move-end="handleMoveEnd"
    />

    <DownloadButton
      :current-extent="currentExtent"
      :current-zoom="currentZoom"
      @start-download="handleStartDownload"
    />

    <!-- Areas Manager Button -->
    <button class="areas-fab" @click="openAreasManager" title="Manage downloaded areas">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    </button>

    <!-- Toggle Areas Overlay Button -->
    <button
      class="toggle-overlay-fab"
      :class="{ active: areasVisible }"
      @click="toggleVisibility"
      :title="areasVisible ? 'Hide downloaded areas' : 'Show downloaded areas'">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    </button>

    <!-- Storage Persistence Indicator -->
    <div class="persistence-panel">
      <StoragePersistenceIndicator />
    </div>

    <DownloadProgress
      :progress="downloadProgress"
      :show="showProgress"
      @cancel="handleCancelDownload"
    />
  </div>
</template>

<style scoped>
.map-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
}

.areas-fab {
  position: fixed;
  top: 80px;
  right: 90px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #10b981;
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

.areas-fab:hover {
  background-color: #059669;
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.toggle-overlay-fab {
  position: fixed;
  top: 150px;
  right: 90px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #6b7280;
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

.toggle-overlay-fab:hover {
  background-color: #4b5563;
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.toggle-overlay-fab.active {
  background-color: #3b82f6;
}

.toggle-overlay-fab.active:hover {
  background-color: #2563eb;
}

.persistence-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  z-index: 1000;
}

@media (max-width: 640px) {
  .persistence-panel {
    left: 10px;
    right: 10px;
    max-width: none;
  }
}
</style>
