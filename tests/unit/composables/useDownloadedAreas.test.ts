import { describe, it, expect, beforeEach } from 'vitest'
import { useDownloadedAreas } from '@/composables/useDownloadedAreas'
import { clear } from 'idb-keyval'
import type { DownloadedArea } from '@/types'
import { createMockBoundingBox } from '../../helpers/mockTiles'

describe('useDownloadedAreas', () => {
  beforeEach(async () => {
    await clear()
  })

  describe('saveAreaMetadata', () => {
    it('should save area metadata to storage', async () => {
      const { saveAreaMetadata, getAreaById } = useDownloadedAreas()
      const area: DownloadedArea = {
        id: 'area-1',
        name: 'Test Area',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 2,
        minZoom: 8,
        maxZoom: 10,
        tileCount: 100,
        sizeBytes: 2048000,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      await saveAreaMetadata(area)

      const retrieved = await getAreaById('area-1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Test Area')
      expect(retrieved?.tileCount).toBe(100)
    })

    it('should overwrite existing area with same ID', async () => {
      const { saveAreaMetadata, getAreaById } = useDownloadedAreas()
      const area1: DownloadedArea = {
        id: 'area-1',
        name: 'Original Name',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 1,
        minZoom: 8,
        maxZoom: 9,
        tileCount: 50,
        sizeBytes: 1024000,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      const area2: DownloadedArea = {
        ...area1,
        name: 'Updated Name',
        tileCount: 100,
      }

      await saveAreaMetadata(area1)
      await saveAreaMetadata(area2)

      const retrieved = await getAreaById('area-1')
      expect(retrieved?.name).toBe('Updated Name')
      expect(retrieved?.tileCount).toBe(100)
    })

    it('should store downloadedAt timestamp', async () => {
      const { saveAreaMetadata, getAreaById } = useDownloadedAreas()
      const now = new Date()
      const area: DownloadedArea = {
        id: 'area-1',
        name: 'Test Area',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 1,
        minZoom: 8,
        maxZoom: 9,
        tileCount: 50,
        sizeBytes: 1024000,
        downloadedAt: now,
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      await saveAreaMetadata(area)

      const retrieved = await getAreaById('area-1')
      expect(retrieved?.downloadedAt).toBeDefined()
    })
  })

  describe('getAllAreas', () => {
    it('should return empty array when no areas saved', async () => {
      const { getAllAreas } = useDownloadedAreas()

      const areas = await getAllAreas()

      expect(areas).toEqual([])
    })

    it('should return all saved areas', async () => {
      const { saveAreaMetadata, getAllAreas } = useDownloadedAreas()
      const area1: DownloadedArea = {
        id: 'area-1',
        name: 'Area 1',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 1,
        minZoom: 8,
        maxZoom: 9,
        tileCount: 50,
        sizeBytes: 1024000,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      const area2: DownloadedArea = {
        id: 'area-2',
        name: 'Area 2',
        bbox: createMockBoundingBox(),
        baseZoom: 9,
        additionalZoomLevels: 2,
        minZoom: 9,
        maxZoom: 11,
        tileCount: 200,
        sizeBytes: 4096000,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      await saveAreaMetadata(area1)
      await saveAreaMetadata(area2)

      const areas = await getAllAreas()

      expect(areas).toHaveLength(2)
      expect(areas.find((a) => a.id === 'area-1')).toBeDefined()
      expect(areas.find((a) => a.id === 'area-2')).toBeDefined()
    })

    it('should sort areas by downloadedAt descending (newest first)', async () => {
      const { saveAreaMetadata, getAllAreas } = useDownloadedAreas()
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const area1: DownloadedArea = {
        id: 'area-1',
        name: 'Old Area',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 1,
        minZoom: 8,
        maxZoom: 9,
        tileCount: 50,
        sizeBytes: 1024000,
        downloadedAt: yesterday,
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      const area2: DownloadedArea = {
        id: 'area-2',
        name: 'New Area',
        bbox: createMockBoundingBox(),
        baseZoom: 9,
        additionalZoomLevels: 2,
        minZoom: 9,
        maxZoom: 11,
        tileCount: 200,
        sizeBytes: 4096000,
        downloadedAt: now,
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      await saveAreaMetadata(area1)
      await saveAreaMetadata(area2)

      const areas = await getAllAreas()

      expect(areas[0].name).toBe('New Area')
      expect(areas[1].name).toBe('Old Area')
    })
  })

  describe('deleteArea', () => {
    it('should delete area metadata', async () => {
      const { saveAreaMetadata, deleteArea, getAreaById } = useDownloadedAreas()
      const area: DownloadedArea = {
        id: 'area-1',
        name: 'Test Area',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 1,
        minZoom: 8,
        maxZoom: 9,
        tileCount: 50,
        sizeBytes: 1024000,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      await saveAreaMetadata(area)
      await deleteArea('area-1')

      const retrieved = await getAreaById('area-1')
      expect(retrieved).toBeNull()
    })

    it('should delete all associated tiles', async () => {
      const { saveAreaMetadata, deleteArea } = useDownloadedAreas()
      const { saveTileToStorage, getAllStoredTileKeys } = await import('@/services/tileDownloader')
      const { calculateDownloadList } = await import('@/services/tileCalculator')

      const bbox = {
        west: 9.0,
        south: 48.5,
        east: 9.1,
        north: 48.6,
      }

      const area: DownloadedArea = {
        id: 'area-1',
        name: 'Test Area',
        bbox,
        baseZoom: 8,
        additionalZoomLevels: 0,
        minZoom: 8,
        maxZoom: 8,
        tileCount: 1,
        sizeBytes: 20480,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      // Calculate which tiles are in this bbox
      const tilesToSave = calculateDownloadList(bbox, 8, 0)

      // Save area and the actual tiles that belong to it
      await saveAreaMetadata(area)
      const blob = new Blob(['tile data'], { type: 'image/png' })
      for (const tile of tilesToSave) {
        await saveTileToStorage(tile, blob)
      }

      // Verify tiles exist before deletion
      const tilesBefore = await getAllStoredTileKeys()
      expect(tilesBefore.length).toBe(tilesToSave.length)

      await deleteArea('area-1')

      // Tiles should be deleted (check by key existence)
      const tilesAfter = await getAllStoredTileKeys()
      expect(tilesAfter.length).toBe(0)
    })

    it('should not throw error when deleting non-existent area', async () => {
      const { deleteArea } = useDownloadedAreas()

      await expect(deleteArea('non-existent')).resolves.not.toThrow()
    })
  })

  describe('getTotalStorageUsed', () => {
    it('should return 0 bytes when no areas', async () => {
      const { getTotalStorageUsed } = useDownloadedAreas()

      const total = await getTotalStorageUsed()

      expect(total).toBe(0)
    })

    it('should calculate total storage from all areas', async () => {
      const { saveAreaMetadata, getTotalStorageUsed } = useDownloadedAreas()
      const area1: DownloadedArea = {
        id: 'area-1',
        name: 'Area 1',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 1,
        minZoom: 8,
        maxZoom: 9,
        tileCount: 50,
        sizeBytes: 10 * 1024 * 1024, // 10 MB
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      const area2: DownloadedArea = {
        id: 'area-2',
        name: 'Area 2',
        bbox: createMockBoundingBox(),
        baseZoom: 9,
        additionalZoomLevels: 2,
        minZoom: 9,
        maxZoom: 11,
        tileCount: 200,
        sizeBytes: 25 * 1024 * 1024, // 25 MB
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      await saveAreaMetadata(area1)
      await saveAreaMetadata(area2)

      const total = await getTotalStorageUsed()

      expect(total).toBe(35 * 1024 * 1024) // 35 MB
    })

    it('should not include deleted areas in total', async () => {
      const { saveAreaMetadata, deleteArea, getTotalStorageUsed } = useDownloadedAreas()
      const area1: DownloadedArea = {
        id: 'area-1',
        name: 'Area 1',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 1,
        minZoom: 8,
        maxZoom: 9,
        tileCount: 50,
        sizeBytes: 10 * 1024 * 1024,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      const area2: DownloadedArea = {
        id: 'area-2',
        name: 'Area 2',
        bbox: createMockBoundingBox(),
        baseZoom: 9,
        additionalZoomLevels: 2,
        minZoom: 9,
        maxZoom: 11,
        tileCount: 200,
        sizeBytes: 25 * 1024 * 1024,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      await saveAreaMetadata(area1)
      await saveAreaMetadata(area2)
      await deleteArea('area-1')

      const total = await getTotalStorageUsed()

      expect(total).toBe(25 * 1024 * 1024) // Only area-2
    })
  })

  describe('getAreaById', () => {
    it('should return null for non-existent area', async () => {
      const { getAreaById } = useDownloadedAreas()

      const area = await getAreaById('non-existent')

      expect(area).toBeNull()
    })

    it('should return area by ID', async () => {
      const { saveAreaMetadata, getAreaById } = useDownloadedAreas()
      const area: DownloadedArea = {
        id: 'area-1',
        name: 'Test Area',
        bbox: createMockBoundingBox(),
        baseZoom: 8,
        additionalZoomLevels: 1,
        minZoom: 8,
        maxZoom: 9,
        tileCount: 50,
        sizeBytes: 1024000,
        downloadedAt: new Date(),
        tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }

      await saveAreaMetadata(area)

      const retrieved = await getAreaById('area-1')

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('area-1')
      expect(retrieved?.name).toBe('Test Area')
    })
  })
})
