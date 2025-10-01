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
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
 * Download a single tile with retry logic and exponential backoff
 * @param tile - The tile coordinates to download
 * @param urlTemplate - URL template with {z}, {x}, {y} placeholders
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds for exponential backoff (default: 1000)
 */
export async function downloadTileWithRetry(
  tile: TileCoord,
  urlTemplate: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Blob> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = urlTemplate
        .replace('{z}', tile.z.toString())
        .replace('{x}', tile.x.toString())
        .replace('{y}', tile.y.toString())

      const response = await fetch(url)

      if (!response.ok) {
        const error = new Error(`Failed to download tile ${tile.z}/${tile.x}/${tile.y}: ${response.status}`)

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw error
        }

        // Retry on server errors (5xx) and rate limits (429)
        lastError = error

        // Don't sleep on last attempt
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1)
          await sleep(delay)
        }
        continue
      }

      return await response.blob()
    } catch (error) {
      lastError = error as Error

      // If this is a non-retryable error (like 4xx), rethrow immediately
      if (error instanceof Error && error.message.includes(': 4')) {
        const status = parseInt(error.message.match(/: (\d+)$/)?.[1] || '0')
        if (status >= 400 && status < 500 && status !== 429) {
          throw error
        }
      }

      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff: baseDelay * 2^(attempt-1)
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await sleep(delay)
    }
  }

  throw lastError || new Error(`Failed to download tile ${tile.z}/${tile.x}/${tile.y} after ${maxRetries} attempts`)
}

/**
 * Download multiple tiles with progress tracking
 * Uses Promise.allSettled to handle failures gracefully
 * Includes retry logic with exponential backoff for failed downloads
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
      const blob = await downloadTileWithRetry(tile, urlTemplate)
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
