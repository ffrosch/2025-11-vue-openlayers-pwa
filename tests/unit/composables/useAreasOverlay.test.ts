import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAreasOverlay } from '@/composables/useAreasOverlay'
import Map from 'ol/Map'
import View from 'ol/View'
import { Collection } from 'ol'
import type { DownloadedArea } from '@/types'
import { createMockDownloadedArea } from '../../helpers/mockTiles'
import * as useDownloadedAreasModule from '@/composables/useDownloadedAreas'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('useAreasOverlay', () => {
  let map: Map
  let mockAreas: DownloadedArea[]

  beforeEach(() => {
    // Create a mock map with a layers collection
    map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
      layers: new Collection(),
    })

    // Create mock areas
    mockAreas = [
      createMockDownloadedArea({ id: 'area-1', name: 'Test Area 1' }),
      createMockDownloadedArea({ id: 'area-2', name: 'Test Area 2' }),
    ]

    // Mock useDownloadedAreas
    vi.spyOn(useDownloadedAreasModule, 'useDownloadedAreas').mockReturnValue({
      getAllAreas: vi.fn().mockResolvedValue(mockAreas),
      saveAreaMetadata: vi.fn(),
      getAreaById: vi.fn(),
      deleteArea: vi.fn(),
      getTotalStorageUsed: vi.fn(),
    })
  })

  it('should initialize with overlay not visible', () => {
    const { isVisible } = useAreasOverlay()
    expect(isVisible.value).toBe(false)
  })

  it('should create vector layer on initialization', async () => {
    const { initializeLayer } = useAreasOverlay()

    const initialLayerCount = map.getLayers().getLength()
    await initializeLayer(map)

    expect(map.getLayers().getLength()).toBe(initialLayerCount + 1)
  })

  it('should load all areas and add features to the layer', async () => {
    const { initializeLayer } = useAreasOverlay()

    await initializeLayer(map)

    const layers = map.getLayers().getArray()
    const vectorLayer = layers[layers.length - 1]
    const source = vectorLayer?.getSource?.()

    expect(source).toBeDefined()
    if (source && 'getFeatures' in source) {
      const features = source.getFeatures()
      expect(features).toHaveLength(2)
      expect(features[0]?.getId()).toBe('area-1')
      expect(features[1]?.getId()).toBe('area-2')
    }
  })

  it('should toggle visibility when toggleVisibility is called', async () => {
    const { initializeLayer, toggleVisibility, isVisible } = useAreasOverlay()

    await initializeLayer(map)

    expect(isVisible.value).toBe(false)

    toggleVisibility()
    expect(isVisible.value).toBe(true)

    const layers = map.getLayers().getArray()
    const vectorLayer = layers[layers.length - 1]
    expect(vectorLayer?.getVisible()).toBe(true)

    toggleVisibility()
    expect(isVisible.value).toBe(false)
    expect(vectorLayer?.getVisible()).toBe(false)
  })

  it('should not initialize layer twice', async () => {
    const { initializeLayer } = useAreasOverlay()

    await initializeLayer(map)
    const layerCountAfterFirst = map.getLayers().getLength()

    await initializeLayer(map)
    expect(map.getLayers().getLength()).toBe(layerCountAfterFirst)
  })

  it('should refresh areas after new download', async () => {
    const newMockAreas = [
      ...mockAreas,
      createMockDownloadedArea({ id: 'area-3', name: 'Test Area 3' }),
    ]
    const mockGetAllAreas = vi.fn()
      .mockResolvedValueOnce(mockAreas)
      .mockResolvedValueOnce(newMockAreas)

    vi.mocked(useDownloadedAreasModule.useDownloadedAreas).mockReturnValue({
      getAllAreas: mockGetAllAreas,
      saveAreaMetadata: vi.fn(),
      getAreaById: vi.fn(),
      deleteArea: vi.fn(),
      getTotalStorageUsed: vi.fn(),
    })

    const { initializeLayer, refreshAreas } = useAreasOverlay()

    await initializeLayer(map)

    const layers = map.getLayers().getArray()
    const vectorLayer = layers[layers.length - 1]
    const source = vectorLayer?.getSource?.()

    if (source && 'getFeatures' in source) {
      expect(source.getFeatures()).toHaveLength(2)

      await refreshAreas()
      expect(source.getFeatures()).toHaveLength(3)
    }
  })

  it('should clear features when refreshing areas', async () => {
    const newMockAreas = [createMockDownloadedArea({ id: 'area-3', name: 'New Area' })]
    const mockGetAllAreas = vi.fn()
      .mockResolvedValueOnce(mockAreas)
      .mockResolvedValueOnce(newMockAreas)

    vi.mocked(useDownloadedAreasModule.useDownloadedAreas).mockReturnValue({
      getAllAreas: mockGetAllAreas,
      saveAreaMetadata: vi.fn(),
      getAreaById: vi.fn(),
      deleteArea: vi.fn(),
      getTotalStorageUsed: vi.fn(),
    })

    const { initializeLayer, refreshAreas } = useAreasOverlay()

    await initializeLayer(map)

    const layers = map.getLayers().getArray()
    const vectorLayer = layers[layers.length - 1]
    const source = vectorLayer?.getSource?.()

    if (source && 'getFeatures' in source) {
      expect(source.getFeatures()).toHaveLength(2)

      await refreshAreas()
      const features = source.getFeatures()
      expect(features).toHaveLength(1)
      expect(features[0]?.getId()).toBe('area-3')
    }
  })

  it('should cleanup features on cleanup call', async () => {
    const { initializeLayer, cleanup } = useAreasOverlay()

    await initializeLayer(map)

    const layers = map.getLayers().getArray()
    const vectorLayer = layers[layers.length - 1]
    const source = vectorLayer?.getSource?.()

    cleanup()

    if (source && 'getFeatures' in source) {
      expect(source.getFeatures()).toHaveLength(0)
    }
  })

  it('should filter areas based on zoom level (maxZoom only)', async () => {
    const areasWithDifferentZooms = [
      createMockDownloadedArea({ id: 'area-low', minZoom: 5, maxZoom: 7 }),
      createMockDownloadedArea({ id: 'area-mid', minZoom: 8, maxZoom: 10 }),
      createMockDownloadedArea({ id: 'area-high', minZoom: 11, maxZoom: 13 }),
    ]

    vi.mocked(useDownloadedAreasModule.useDownloadedAreas).mockReturnValue({
      getAllAreas: vi.fn().mockResolvedValue(areasWithDifferentZooms),
      saveAreaMetadata: vi.fn(),
      getAreaById: vi.fn(),
      deleteArea: vi.fn(),
      getTotalStorageUsed: vi.fn(),
    })

    const { initializeLayer, updateAreasForZoom } = useAreasOverlay()
    await initializeLayer(map, null) // Initialize without zoom filter

    const layers = map.getLayers().getArray()
    const vectorLayer = layers[layers.length - 1]
    const source = vectorLayer?.getSource?.()

    if (source && 'getFeatures' in source) {
      // Zoom 6 - should show all areas (6 <= 7, 6 <= 10, 6 <= 13)
      await updateAreasForZoom(6)
      expect(source.getFeatures()).toHaveLength(3)

      // Zoom 8 - should show area-mid and area-high (8 <= 10, 8 <= 13, but 8 > 7)
      await updateAreasForZoom(8)
      expect(source.getFeatures()).toHaveLength(2)
      const ids8 = source.getFeatures().map(f => f.getId())
      expect(ids8).toContain('area-mid')
      expect(ids8).toContain('area-high')

      // Zoom 11 - should show area-high only (11 <= 13, but 11 > 7 and 11 > 10)
      await updateAreasForZoom(11)
      expect(source.getFeatures()).toHaveLength(1)
      expect(source.getFeatures()[0]?.getId()).toBe('area-high')

      // Zoom 4 - should show all areas (4 <= 7, 4 <= 10, 4 <= 13)
      await updateAreasForZoom(4)
      expect(source.getFeatures()).toHaveLength(3)

      // Zoom 15 - should show nothing (15 > 7, 15 > 10, 15 > 13)
      await updateAreasForZoom(15)
      expect(source.getFeatures()).toHaveLength(0)
    }
  })

  it('should show areas at maxZoom boundary (ignores minZoom)', async () => {
    const area = createMockDownloadedArea({ id: 'area-boundary', minZoom: 8, maxZoom: 10 })

    vi.mocked(useDownloadedAreasModule.useDownloadedAreas).mockReturnValue({
      getAllAreas: vi.fn().mockResolvedValue([area]),
      saveAreaMetadata: vi.fn(),
      getAreaById: vi.fn(),
      deleteArea: vi.fn(),
      getTotalStorageUsed: vi.fn(),
    })

    const { initializeLayer, updateAreasForZoom } = useAreasOverlay()
    await initializeLayer(map)

    const layers = map.getLayers().getArray()
    const vectorLayer = layers[layers.length - 1]
    const source = vectorLayer?.getSource?.()

    if (source && 'getFeatures' in source) {
      // Below minZoom (7) - should still show (minZoom ignored, zoom <= 10)
      await updateAreasForZoom(7)
      expect(source.getFeatures()).toHaveLength(1)

      // At minZoom (8) - should show
      await updateAreasForZoom(8)
      expect(source.getFeatures()).toHaveLength(1)

      // At maxZoom (10) - should show
      await updateAreasForZoom(10)
      expect(source.getFeatures()).toHaveLength(1)

      // Above maxZoom (11) - should not show
      await updateAreasForZoom(11)
      expect(source.getFeatures()).toHaveLength(0)
    }
  })

  it('should show all areas when zoom is null', async () => {
    const { initializeLayer, updateAreasForZoom } = useAreasOverlay()

    vi.mocked(useDownloadedAreasModule.useDownloadedAreas).mockReturnValue({
      getAllAreas: vi.fn().mockResolvedValue(mockAreas),
      saveAreaMetadata: vi.fn(),
      getAreaById: vi.fn(),
      deleteArea: vi.fn(),
      getTotalStorageUsed: vi.fn(),
    })

    await initializeLayer(map)

    const layers = map.getLayers().getArray()
    const vectorLayer = layers[layers.length - 1]
    const source = vectorLayer?.getSource?.()

    if (source && 'getFeatures' in source) {
      // With null zoom, all areas should be shown
      await updateAreasForZoom(null)
      expect(source.getFeatures()).toHaveLength(2)
    }
  })
})
