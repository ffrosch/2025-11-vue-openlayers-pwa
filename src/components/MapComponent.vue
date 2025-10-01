<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat } from 'ol/proj'
import type { MapConfig } from '@/types'
import 'ol/ol.css'

interface Props {
  config: MapConfig
}

const props = defineProps<Props>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: Map | null = null

onMounted(() => {
  if (!mapContainer.value) return

  // Create OpenStreetMap layer
  const osmLayer = new TileLayer({
    source: new OSM()
  })

  // Initialize the map
  map = new Map({
    target: mapContainer.value,
    layers: [osmLayer],
    view: new View({
      center: fromLonLat(props.config.center),
      zoom: props.config.zoom
    })
  })
})

onBeforeUnmount(() => {
  if (map) {
    map.setTarget(undefined)
    map = null
  }
})
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>
