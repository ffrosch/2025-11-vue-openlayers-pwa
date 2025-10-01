<script setup lang="ts">
import MapComponent from '@/components/MapComponent.vue'
import type { MapConfig } from '@/types'

// Baden-Württemberg coordinates: approximately 48.6616°N, 9.3501°E
// Zoom level 8 provides a good overview of the state
const mapConfig: MapConfig = {
  center: [9.3501, 48.6616], // [longitude, latitude]
  zoom: 8
}
</script>

<template>
  <div class="map-view">
    <MapComponent :config="mapConfig" />
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
