<script setup lang="ts">
import { useRouter } from 'vue-router'
import OfflineAreasManager from '@/components/OfflineAreasManager.vue'

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
    <OfflineAreasManager @view-on-map="handleViewOnMap" @close="handleClose" />
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
}
</style>
