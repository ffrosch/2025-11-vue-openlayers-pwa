<script setup lang="ts">
import { ref } from 'vue'
import MapComponent from '@/components/MapComponent.vue'
import DownloadButton from '@/components/DownloadButton.vue'
import DownloadProgress from '@/components/DownloadProgress.vue'
import type { MapConfig, BoundingBox } from '@/types'
import { useOfflineTiles } from '@/composables/useOfflineTiles'

// Baden-Württemberg coordinates: approximately 48.6616°N, 9.3501°E
// Zoom level 8 provides a good overview of the state
const mapConfig: MapConfig = {
  center: [9.3501, 48.6616], // [longitude, latitude]
  zoom: 8
}

const currentExtent = ref<BoundingBox | null>({
  west: 8.0,
  south: 47.5,
  east: 10.5,
  north: 49.8,
})
const currentZoom = ref(mapConfig.zoom)
const showProgress = ref(false)

const { downloadArea, downloadProgress, cancelDownload } = useOfflineTiles()

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
    <MapComponent :config="mapConfig" />

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
