<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MapComponent from '@/components/MapComponent.vue'
import DownloadButton from '@/components/DownloadButton.vue'
import DownloadProgress from '@/components/DownloadProgress.vue'
import type { MapConfig, BoundingBox } from '@/types'
import { useOfflineTiles } from '@/composables/useOfflineTiles'
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

function handleMapReady(map: Map) {
  mapInstance.value = map
  updateMapInfo()
}

function handleMoveEnd({ map }: { map: Map }) {
  mapInstance.value = map
  updateMapInfo()
}

function updateMapInfo() {
  if (!mapInstance.value) return

  currentExtent.value = getCurrentMapExtent(mapInstance.value as Map)
  const zoom = mapInstance.value.getView().getZoom()
  currentZoom.value = zoom ? Math.round(zoom) : mapConfig.zoom
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
</style>
