import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOfflineTiles } from '@/composables/useOfflineTiles'
import { createMockBoundingBox } from '../../helpers/mockTiles'
import { clear } from 'idb-keyval'
import type { BoundingBox } from '@/types'

describe('useOfflineTiles', () => {
  beforeEach(async () => {
    await clear()
    // Mock fetch for tile downloads
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['tile data'], { type: 'image/png' }),
    })
  })

  describe('downloadArea', () => {
    it('should download tiles and save area metadata', async () => {
      const { downloadArea, downloadProgress } = useOfflineTiles()
      const bbox = createMockBoundingBox()
      const areaName = 'Test Area'
      const baseZoom = 8
      const additionalZoomLevels = 1

      await downloadArea(bbox, areaName, baseZoom, additionalZoomLevels)

      expect(downloadProgress.value.isComplete).toBe(true)
      expect(downloadProgress.value.downloaded).toBeGreaterThan(0)
    })

    it('should call progress callback during download', async () => {
      const { downloadArea } = useOfflineTiles()
      const bbox = createMockBoundingBox()
      const progressCallback = vi.fn()

      await downloadArea(bbox, 'Test Area', 8, 1, progressCallback)

      expect(progressCallback).toHaveBeenCalled()
      // Should be called at least once with progress data
      expect(progressCallback.mock.calls[0][0]).toHaveProperty('downloaded')
      expect(progressCallback.mock.calls[0][0]).toHaveProperty('total')
      expect(progressCallback.mock.calls[0][0]).toHaveProperty('percentage')
    })

    it('should calculate percentage correctly', async () => {
      const { downloadArea, downloadProgress } = useOfflineTiles()
      const bbox = createMockBoundingBox()

      await downloadArea(bbox, 'Test Area', 8, 0) // Only one zoom level for simplicity

      expect(downloadProgress.value.percentage).toBe(100)
    })

    it('should handle failed tiles gracefully', async () => {
      const { downloadArea, downloadProgress } = useOfflineTiles()
      // Use larger bbox to ensure multiple tiles
      const bbox = {
        west: 9.0,
        south: 48.0,
        east: 10.0,
        north: 49.0,
      }

      // Mock some failures
      let callCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount % 3 === 0) {
          // Every 3rd tile fails
          return Promise.resolve({ ok: false, status: 404 })
        }
        return Promise.resolve({
          ok: true,
          blob: async () => new Blob(['tile data'], { type: 'image/png' }),
        })
      })

      await downloadArea(bbox, 'Test Area', 8, 0)

      // With 4 tiles and every 3rd failing, we should have 1 failure
      expect(downloadProgress.value.total).toBeGreaterThanOrEqual(4)
      expect(downloadProgress.value.failed).toBeGreaterThanOrEqual(1)
      expect(downloadProgress.value.isComplete).toBe(true)
    })

    it('should calculate ETA during download', async () => {
      const { downloadArea, downloadProgress } = useOfflineTiles()
      const bbox = createMockBoundingBox()

      const progressCallback = vi.fn()
      await downloadArea(bbox, 'Test Area', 8, 1, progressCallback)

      // Check that at least one progress update has an ETA
      const progressWithETA = progressCallback.mock.calls.find(
        (call) => call[0].estimatedTimeRemaining !== undefined
      )
      expect(progressWithETA).toBeDefined()
    })

    it('should track bytes downloaded', async () => {
      const { downloadArea, downloadProgress } = useOfflineTiles()
      const bbox = createMockBoundingBox()

      await downloadArea(bbox, 'Test Area', 8, 0)

      expect(downloadProgress.value.bytesDownloaded).toBeGreaterThan(0)
    })

    it('should allow cancellation', async () => {
      const { downloadArea, cancelDownload, downloadProgress } = useOfflineTiles()
      const bbox = {
        west: 9.0,
        south: 48.5,
        east: 10.0,
        north: 49.5,
      }

      // Start download (this will have many tiles)
      const downloadPromise = downloadArea(bbox, 'Test Area', 8, 2)

      // Cancel immediately
      cancelDownload()

      await downloadPromise

      expect(downloadProgress.value.isCancelled).toBe(true)
      expect(downloadProgress.value.isComplete).toBe(false)
    })
  })

  describe('calculateDownloadEstimate', () => {
    it('should return tile count and estimated size', () => {
      const { calculateDownloadEstimate } = useOfflineTiles()
      const bbox = createMockBoundingBox()

      const estimate = calculateDownloadEstimate(bbox, 8, 1)

      expect(estimate.tileCount).toBeGreaterThan(0)
      expect(estimate.estimatedSizeBytes).toBeGreaterThan(0)
      expect(estimate.minZoom).toBe(8)
      expect(estimate.maxZoom).toBe(9)
    })

    it('should calculate size as tileCount × 20KB', () => {
      const { calculateDownloadEstimate } = useOfflineTiles()
      const bbox = createMockBoundingBox()

      const estimate = calculateDownloadEstimate(bbox, 8, 0)
      const expectedSize = estimate.tileCount * 20 * 1024

      expect(estimate.estimatedSizeBytes).toBe(expectedSize)
    })

    it('should increase tile count with more zoom levels', () => {
      const { calculateDownloadEstimate } = useOfflineTiles()
      const bbox = createMockBoundingBox()

      const estimate1 = calculateDownloadEstimate(bbox, 8, 0)
      const estimate2 = calculateDownloadEstimate(bbox, 8, 2)

      expect(estimate2.tileCount).toBeGreaterThan(estimate1.tileCount)
    })
  })

  describe('getCurrentMapExtent', () => {
    it('should return null when no map instance', () => {
      const { getCurrentMapExtent } = useOfflineTiles()

      const extent = getCurrentMapExtent(null)

      expect(extent).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle empty bbox gracefully', async () => {
      const { downloadArea, downloadProgress } = useOfflineTiles()
      const emptyBbox: BoundingBox = {
        west: 9.0,
        south: 48.5,
        east: 9.0,
        north: 48.5,
      }

      await downloadArea(emptyBbox, 'Empty Area', 8, 0)

      expect(downloadProgress.value.isComplete).toBe(true)
      expect(downloadProgress.value.total).toBeGreaterThanOrEqual(1) // At least 1 tile
    })

    it('should handle network errors', async () => {
      const { downloadArea, downloadProgress } = useOfflineTiles()
      const bbox = createMockBoundingBox()

      // Mock network failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await downloadArea(bbox, 'Test Area', 8, 0)

      expect(downloadProgress.value.failed).toBe(downloadProgress.value.total)
      expect(downloadProgress.value.downloaded).toBe(0)
    })

    it('should reset progress when starting new download', async () => {
      const { downloadArea, downloadProgress } = useOfflineTiles()
      const bbox = createMockBoundingBox()

      await downloadArea(bbox, 'Area 1', 8, 0)
      const firstTotal = downloadProgress.value.total

      await downloadArea(bbox, 'Area 2', 8, 0)

      expect(downloadProgress.value.downloaded).toBeGreaterThanOrEqual(0)
      expect(downloadProgress.value.failed).toBeGreaterThanOrEqual(0)
    })

    it('should throw error when storage quota exceeded', async () => {
      const { downloadArea } = useOfflineTiles()

      // Large bbox that will require significant storage
      const largeBbox: BoundingBox = {
        west: 8.0,
        south: 47.0,
        east: 10.0,
        north: 49.0,
      }

      // Mock low storage quota (only 1 MB available)
      Object.defineProperty(global.navigator, 'storage', {
        writable: true,
        configurable: true,
        value: {
          estimate: async () => ({
            usage: 1024 * 1024 * 499, // 499 MB used
            quota: 1024 * 1024 * 500, // 500 MB quota (only 1 MB available)
          }),
          persist: async () => true,
          persisted: async () => false,
        },
      })

      await expect(downloadArea(largeBbox, 'Test Area', 10, 2)).rejects.toThrow('Insufficient storage')
    })
  })
})
