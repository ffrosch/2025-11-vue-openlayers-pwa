<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat } from 'ol/proj'
import type { Tile as OLTile } from 'ol'
import type { MapConfig } from '@/types'
import { getAllStoredTileKeys, getTileFromStorage, saveTileToStorage } from '@/services/tileDownloader'
import 'ol/ol.css'

interface Props {
  config: MapConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'mapReady', map: Map): void
  (e: 'moveEnd', payload: { map: Map }): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: Map | null = null

// Custom tile load function for offline support
const offlineTileLoadFunction = async (tile: OLTile, src: string) => {
  const imageTile = tile as any // OpenLayers ImageTile
  const img = imageTile.getImage() as HTMLImageElement

  // Parse tile coordinates from URL
  // OSM URL format: https://tile.openstreetmap.org/{z}/{x}/{y}.png
  const urlParts = src.match(/\/(\d+)\/(\d+)\/(\d+)\.png/)
  if (!urlParts) {
    // If URL format doesn't match, fall back to network load
    img.src = src
    return
  }

  const tileCoord = {
    z: parseInt(urlParts[1]!),
    x: parseInt(urlParts[2]!),
    y: parseInt(urlParts[3]!),
  }

  try {
    // Try to load from IndexedDB first
    const cachedBlob = await getTileFromStorage(tileCoord)

    if (cachedBlob && cachedBlob instanceof Blob) {
      // Use cached tile
      const objectUrl = URL.createObjectURL(cachedBlob)
      img.src = objectUrl
      img.onload = () => URL.revokeObjectURL(objectUrl)
      return
    }

    // Not in cache, load from network
    if (navigator.onLine) {
      const response = await fetch(src)
      if (response.ok) {
        const blob = await response.blob()
        // Save to cache for future use
        await saveTileToStorage(tileCoord, blob)
        const objectUrl = URL.createObjectURL(blob)
        img.src = objectUrl
        img.onload = () => URL.revokeObjectURL(objectUrl)
        return
      }
    }

    // If offline or fetch failed, show placeholder
    // Use a data URL for a simple gray placeholder
    img.src =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mM88x8AAp0BzdNtlUkAAAAASUVORK5CYII='
  } catch (error) {
    console.error('Error loading tile:', error)
    // Show placeholder on error
    img.src =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mM88x8AAp0BzdNtlUkAAAAASUVORK5CYII='
  }
}

onMounted(() => {
  if (!mapContainer.value) return

  // Create OpenStreetMap source with custom tile load function
  const osmSource = new OSM()
  osmSource.setTileLoadFunction(offlineTileLoadFunction)

  // Create OpenStreetMap layer
  const osmLayer = new TileLayer({
    source: osmSource,
  })

  // Initialize the map
  map = new Map({
    target: mapContainer.value,
    layers: [osmLayer],
    view: new View({
      center: fromLonLat(props.config.center),
      zoom: props.config.zoom,
    }),
  })

  // Emit map ready event
  emit('mapReady', map)

  // Listen to move end events
  map.on('moveend', () => {
    if (map) {
      emit('moveEnd', { map })
    }
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
