<script setup lang="ts">
import { useRouter } from 'vue-router'
import OfflineAreasManager from '@/components/OfflineAreasManager.vue'
import StoragePersistenceIndicator from '@/components/StoragePersistenceIndicator.vue'
import CompressionSettings from '@/components/CompressionSettings.vue'

const router = useRouter()

function handleViewOnMap(bbox: { west: number; south: number; east: number; north: number }) {
  // Navigate to map view with bbox as query params
  router.push({
    name: 'map',
    query: {
      west: bbox.west.toString(),
      south: bbox.south.toString(),
      east: bbox.east.toString(),
      north: bbox.north.toString(),
    },
  })
}

function handleClose() {
  router.push({ name: 'map' })
}
</script>

<template>
  <div class="offline-areas-view">
    <div class="areas-container">
      <div class="persistence-section">
        <StoragePersistenceIndicator />
      </div>
      <div class="compression-section">
        <CompressionSettings />
      </div>
      <OfflineAreasManager @view-on-map="handleViewOnMap" @close="handleClose" />
    </div>
  </div>
</template>

<style scoped>
.offline-areas-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  background: #f9fafb;
}

.areas-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.persistence-section {
  margin-bottom: 1.5rem;
}

.compression-section {
  margin-bottom: 1.5rem;
}
</style>
