import { ref, readonly } from 'vue'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Polygon } from 'ol/geom'
import { Feature } from 'ol'
import { fromLonLat } from 'ol/proj'
import { Fill, Stroke, Style } from 'ol/style'
import type Map from 'ol/Map'
import type { DownloadedArea } from '@/types'
import { useDownloadedAreas } from '@/composables/useDownloadedAreas'

export function useAreasOverlay() {
  const { getAllAreas } = useDownloadedAreas()
  const vectorLayer = ref<VectorLayer<VectorSource> | null>(null)
  const isVisible = ref(false)
  const currentZoom = ref<number | null>(null)

  const createVectorLayer = (): VectorLayer<VectorSource> => {
    const source = new VectorSource()

    // Create striped pattern using canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context) {
      const size = 10
      canvas.width = size
      canvas.height = size

      // Red stripes (diagonal lines)
      context.strokeStyle = 'rgba(239, 68, 68, 0.4)' // red-500 with 40% opacity
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(0, 0)
      context.lineTo(size, size)
      context.stroke()

      context.beginPath()
      context.moveTo(0, size)
      context.lineTo(size, 0)
      context.stroke()
    }

    const layer = new VectorLayer({
      source,
      style: new Style({
        fill: new Fill({
          color: context ? context.createPattern(canvas, 'repeat') || 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)', // red-500 striped or fallback
        }),
        stroke: new Stroke({
          color: 'rgba(239, 68, 68, 0.6)', // red-500 with 60% opacity
          width: 2,
        }),
      }),
      zIndex: 100, // Above base map tiles
    })
    layer.setVisible(false)
    return layer
  }

  const addAreaToLayer = (area: DownloadedArea, source: VectorSource) => {
    const { bbox } = area
    // Convert bbox corners to Web Mercator projection
    const bottomLeft = fromLonLat([bbox.west, bbox.south])
    const bottomRight = fromLonLat([bbox.east, bbox.south])
    const topRight = fromLonLat([bbox.east, bbox.north])
    const topLeft = fromLonLat([bbox.west, bbox.north])

    const polygon = new Polygon([[bottomLeft, bottomRight, topRight, topLeft, bottomLeft]])
    const feature = new Feature({ geometry: polygon })
    feature.setId(area.id)
    source.addFeature(feature)
  }

  const initializeLayer = async (map: Map, zoom: number | null = null): Promise<void> => {
    if (!vectorLayer.value) {
      const layer = createVectorLayer()
      vectorLayer.value = layer
      map.getLayers().push(layer)
    }

    // Load areas with zoom filter if provided
    currentZoom.value = zoom
    const areas = await getAllAreas()
    const source = vectorLayer.value.getSource()
    if (source) {
      source.clear()
      const filteredAreas = zoom !== null
        ? areas.filter((area) => shouldShowArea(area, zoom))
        : areas
      filteredAreas.forEach((area) => addAreaToLayer(area, source))
    }
  }

  const toggleVisibility = (): void => {
    if (vectorLayer.value) {
      isVisible.value = !isVisible.value
      vectorLayer.value.setVisible(isVisible.value)
    }
  }

  const shouldShowArea = (area: DownloadedArea, zoom: number | null): boolean => {
    if (zoom === null) return true
    // Show area only if current zoom <= maxZoom
    const shouldShow = zoom <= area.maxZoom
    // console.log(`[useAreasOverlay] Area "${area.name}" (minZoom: ${area.minZoom}, maxZoom: ${area.maxZoom}), currentZoom: ${zoom}, shouldShow: ${shouldShow}`)
    return shouldShow
  }

  const updateAreasForZoom = async (zoom: number | null): Promise<void> => {
    if (!vectorLayer.value) return

    // console.log(`[useAreasOverlay] updateAreasForZoom called with zoom: ${zoom}`)
    currentZoom.value = zoom
    const areas = await getAllAreas()
    // console.log(`[useAreasOverlay] Total areas: ${areas.length}`)
    const source = vectorLayer.value.getSource()
    if (source) {
      source.clear()
      const filteredAreas = areas.filter((area) => shouldShowArea(area, zoom))
      // console.log(`[useAreasOverlay] Filtered areas: ${filteredAreas.length}`)
      filteredAreas.forEach((area) => addAreaToLayer(area, source))
    }
  }

  const refreshAreas = async (): Promise<void> => {
    await updateAreasForZoom(currentZoom.value)
  }

  const cleanup = (): void => {
    if (vectorLayer.value) {
      const source = vectorLayer.value.getSource()
      if (source) {
        source.clear()
      }
    }
  }

  return {
    isVisible: readonly(isVisible),
    initializeLayer,
    toggleVisibility,
    updateAreasForZoom,
    refreshAreas,
    cleanup,
  }
}
