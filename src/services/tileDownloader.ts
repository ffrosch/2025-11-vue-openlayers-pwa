import { get, set, del, keys } from 'idb-keyval'
import type { TileCoord } from '@/types'

export interface TileStorageData {
  data: Blob | { type: string; size: number } // Blob or plain object for testing
  storedAt: string
}

export interface DownloadProgressCallback {
  (progress: { downloaded: number; failed: number; total: number }): void
}

/**
 * Get tile from IndexedDB storage
 */
export async function getTileFromStorage(tile: TileCoord): Promise<Blob | null> {
  const key = `tile_${tile.z}_${tile.x}_${tile.y}`
  const stored = await get<TileStorageData>(key)

  if (!stored || !stored.data) {
    return null
  }

  // Handle both real Blobs and fake-indexeddb serialized Blobs (for testing)
  if (stored.data instanceof Blob) {
    return stored.data
  }

  // In testing environment, fake-indexeddb may serialize Blob as plain object
  // Return it as-is for testing, but in production this would be a real Blob
  return stored.data as unknown as Blob
}

/**
 * Save tile blob to IndexedDB storage
 */
export async function saveTileToStorage(tile: TileCoord, blob: Blob): Promise<void> {
  const key = `tile_${tile.z}_${tile.x}_${tile.y}`
  const data: TileStorageData = {
    data: blob,
    storedAt: new Date().toISOString(),
  }

  await set(key, data)
}

/**
 * Delete tile from IndexedDB storage
 */
export async function deleteTileFromStorage(tile: TileCoord): Promise<void> {
  const key = `tile_${tile.z}_${tile.x}_${tile.y}`
  await del(key)
}

/**
 * Get all stored tile keys
 */
export async function getAllStoredTileKeys(): Promise<string[]> {
  const allKeys = await keys()
  return allKeys.filter((key) => typeof key === 'string' && key.startsWith('tile_')) as string[]
}

/**
 * Download a single tile from the given URL template
 */
export async function downloadTile(tile: TileCoord, urlTemplate: string): Promise<Blob> {
  const url = urlTemplate
    .replace('{z}', tile.z.toString())
    .replace('{x}', tile.x.toString())
    .replace('{y}', tile.y.toString())

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download tile ${tile.z}/${tile.x}/${tile.y}: ${response.status}`)
  }

  return await response.blob()
}

/**
 * Download multiple tiles with progress tracking
 * Uses Promise.allSettled to handle failures gracefully
 */
export async function downloadTiles(
  tiles: TileCoord[],
  urlTemplate: string,
  onProgress?: DownloadProgressCallback
): Promise<void> {
  let downloaded = 0
  let failed = 0
  const total = tiles.length

  const downloadPromises = tiles.map(async (tile) => {
    try {
      const blob = await downloadTile(tile, urlTemplate)
      await saveTileToStorage(tile, blob)
      downloaded++
      if (onProgress) {
        onProgress({ downloaded, failed, total })
      }
    } catch (error) {
      failed++
      if (onProgress) {
        onProgress({ downloaded, failed, total })
      }
      // Don't rethrow - let other downloads continue
    }
  })

  await Promise.allSettled(downloadPromises)
}
