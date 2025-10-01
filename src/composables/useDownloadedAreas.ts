import { get, set, del, keys } from 'idb-keyval'
import type { DownloadedArea } from '@/types'
import { deleteTileFromStorage } from '@/services/tileDownloader'
import { calculateDownloadList } from '@/services/tileCalculator'

const AREA_KEY_PREFIX = 'area_'

export interface UseDownloadedAreasReturn {
  saveAreaMetadata: (area: DownloadedArea) => Promise<void>
  getAllAreas: () => Promise<DownloadedArea[]>
  getAreaById: (areaId: string) => Promise<DownloadedArea | null>
  deleteArea: (areaId: string) => Promise<void>
  getTotalStorageUsed: () => Promise<number>
}

export function useDownloadedAreas(): UseDownloadedAreasReturn {
  /**
   * Save area metadata to IndexedDB
   */
  async function saveAreaMetadata(area: DownloadedArea): Promise<void> {
    const key = `${AREA_KEY_PREFIX}${area.id}`
      const areaToStore = {
        ...area,
        // Ensure downloadedAt is stored as ISO string
        downloadedAt: typeof area.downloadedAt === 'string'
          ? area.downloadedAt
          : new Date(area.downloadedAt).toISOString(),
        // Make sure object is no proxy, which would fail
        bbox: { ...area.bbox }
      }
      
    await set(key, areaToStore)
  }

  /**
   * Get all downloaded areas, sorted by downloadedAt descending (newest first)
   */
  async function getAllAreas(): Promise<DownloadedArea[]> {
    const allKeys = await keys()
    const areaKeys = allKeys.filter((key) => typeof key === 'string' && key.startsWith(AREA_KEY_PREFIX))

    const areas: DownloadedArea[] = []
    for (const key of areaKeys) {
      const area = await get<DownloadedArea>(key as string)
      if (area) {
        areas.push(area)
      }
    }

    // Sort by downloadedAt descending (newest first)
    // ISO 8601 strings can be compared directly
    return areas.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt))
  }

  /**
   * Get a single area by ID
   */
  async function getAreaById(areaId: string): Promise<DownloadedArea | null> {
    const key = `${AREA_KEY_PREFIX}${areaId}`
    const area = await get<DownloadedArea>(key)
    return area || null
  }

  /**
   * Delete an area and all its associated tiles
   */
  async function deleteArea(areaId: string): Promise<void> {
    // Get area metadata
    const area = await getAreaById(areaId)
    if (!area) {
      return // Area doesn't exist, nothing to delete
    }

    // Calculate which tiles belong to this area
    const tilesToDelete = calculateDownloadList(area.bbox, area.baseZoom, area.additionalZoomLevels)

    // Delete all tiles
    for (const tile of tilesToDelete) {
      await deleteTileFromStorage(tile)
    }

    // Delete area metadata
    const key = `${AREA_KEY_PREFIX}${areaId}`
    await del(key)
  }

  /**
   * Calculate total storage used by all downloaded areas
   */
  async function getTotalStorageUsed(): Promise<number> {
    const areas = await getAllAreas()
    return areas.reduce((total, area) => total + area.sizeBytes, 0)
  }

  return {
    saveAreaMetadata,
    getAllAreas,
    getAreaById,
    deleteArea,
    getTotalStorageUsed,
  }
}
