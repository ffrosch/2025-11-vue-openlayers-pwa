import { ref, type Ref } from 'vue'
import type { BoundingBox, DownloadProgress, DownloadedArea } from '@/types'
import { calculateDownloadList, estimateDownloadSize } from '@/services/tileCalculator'
import { downloadTiles } from '@/services/tileDownloader'
import { useDownloadedAreas } from '@/composables/useDownloadedAreas'
import type Map from 'ol/Map'
import { transformExtent } from 'ol/proj'

export interface DownloadEstimate {
  tileCount: number
  estimatedSizeBytes: number
  minZoom: number
  maxZoom: number
}

export interface UseOfflineTilesReturn {
  downloadProgress: Ref<DownloadProgress>
  downloadArea: (
    bbox: BoundingBox,
    areaName: string,
    baseZoom: number,
    additionalZoomLevels: number,
    onProgress?: (progress: DownloadProgress) => void
  ) => Promise<void>
  cancelDownload: () => void
  calculateDownloadEstimate: (bbox: BoundingBox, baseZoom: number, additionalZoomLevels: number) => DownloadEstimate
  getCurrentMapExtent: (map: Map | null) => BoundingBox | null
}

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export function useOfflineTiles(): UseOfflineTilesReturn {
  const downloadProgress = ref<DownloadProgress>({
    areaId: '',
    total: 0,
    downloaded: 0,
    failed: 0,
    percentage: 0,
    bytesDownloaded: 0,
    isComplete: false,
    isCancelled: false,
  })

  const { saveAreaMetadata } = useDownloadedAreas()

  let cancelRequested = false
  let downloadStartTime = 0

  async function downloadArea(
    bbox: BoundingBox,
    areaName: string,
    baseZoom: number,
    additionalZoomLevels: number,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    // Reset state
    cancelRequested = false
    downloadStartTime = Date.now()

    // Calculate tiles to download
    const tiles = calculateDownloadList(bbox, baseZoom, additionalZoomLevels)
    const areaId = crypto.randomUUID()

    // Initialize progress
    downloadProgress.value = {
      areaId,
      total: tiles.length,
      downloaded: 0,
      failed: 0,
      percentage: 0,
      bytesDownloaded: 0,
      isComplete: false,
      isCancelled: false,
    }

    // Progress callback
    const progressCallback = (stats: { downloaded: number; failed: number; total: number }) => {
      const downloaded = stats.downloaded
      const failed = stats.failed
      const percentage = stats.total > 0 ? Math.round(((downloaded + failed) / stats.total) * 100) : 0

      // Calculate ETA
      let estimatedTimeRemaining: number | undefined
      if (downloaded > 0) {
        const elapsed = Date.now() - downloadStartTime
        const avgTimePerTile = elapsed / downloaded
        const remaining = stats.total - downloaded - failed
        estimatedTimeRemaining = Math.round((avgTimePerTile * remaining) / 1000) // seconds
      }

      // Estimate bytes downloaded (20KB per tile)
      const bytesDownloaded = downloaded * 20 * 1024

      downloadProgress.value = {
        ...downloadProgress.value,
        downloaded,
        failed,
        percentage,
        estimatedTimeRemaining,
        bytesDownloaded,
      }

      if (onProgress) {
        onProgress(downloadProgress.value)
      }
    }

    // Download tiles
    await downloadTiles(tiles, DEFAULT_TILE_URL, progressCallback)

    // Check if cancelled
    if (cancelRequested) {
      downloadProgress.value.isCancelled = true
      downloadProgress.value.isComplete = false
      return
    }

    // Mark as complete
    downloadProgress.value.isComplete = true
    downloadProgress.value.percentage = 100

    // Save area metadata to IndexedDB
    const area: DownloadedArea = {
      id: areaId,
      name: areaName,
      bbox,
      baseZoom,
      additionalZoomLevels,
      minZoom: baseZoom,
      maxZoom: baseZoom + additionalZoomLevels,
      tileCount: tiles.length,
      sizeBytes: downloadProgress.value.bytesDownloaded,
      downloadedAt: new Date(),
      tileUrlTemplate: DEFAULT_TILE_URL,
    }

    await saveAreaMetadata(area)
  }

  function cancelDownload(): void {
    cancelRequested = true
  }

  function calculateDownloadEstimate(
    bbox: BoundingBox,
    baseZoom: number,
    additionalZoomLevels: number
  ): DownloadEstimate {
    const tiles = calculateDownloadList(bbox, baseZoom, additionalZoomLevels)
    const estimatedSizeBytes = estimateDownloadSize(tiles)

    return {
      tileCount: tiles.length,
      estimatedSizeBytes,
      minZoom: baseZoom,
      maxZoom: baseZoom + additionalZoomLevels,
    }
  }

  function getCurrentMapExtent(map: Map | null): BoundingBox | null {
    if (!map) return null

    const view = map.getView()
    const extent = view.calculateExtent(map.getSize())

    // Transform from Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
    const transformed = transformExtent(extent, 'EPSG:3857', 'EPSG:4326')
    const [west, south, east, north] = transformed

    return { west: west!, south: south!, east: east!, north: north! }
  }

  return {
    downloadProgress,
    downloadArea,
    cancelDownload,
    calculateDownloadEstimate,
    getCurrentMapExtent,
  }
}
