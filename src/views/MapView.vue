<script setup lang="ts">
import { ref } from 'vue'
import MapComponent from '@/components/MapComponent.vue'
import DownloadButton from '@/components/DownloadButton.vue'
import DownloadProgress from '@/components/DownloadProgress.vue'
import type { MapConfig, BoundingBox } from '@/types'
import { useOfflineTiles } from '@/composables/useOfflineTiles'
import type Map from 'ol/Map'

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
  await downloadArea(
    payload.bbox,
    payload.name,
    payload.baseZoom,
    payload.additionalLevels,
    () => {
      // Progress updates are automatically tracked in downloadProgress ref
    }
  )
}

function handleCancelDownload() {
  if (!downloadProgress.value.isComplete && !downloadProgress.value.isCancelled) {
    cancelDownload()
  } else {
    showProgress.value = false
  }
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
</style>
