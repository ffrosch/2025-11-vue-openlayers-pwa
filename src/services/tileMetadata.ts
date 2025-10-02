import { get, set, del } from 'idb-keyval'
import type { TileCoord, TileMetadata, CompressionFormat, CompressionProfile } from '@/types'

/**
 * Generate storage key for tile metadata
 */
function getMetadataKey(tile: TileCoord): string {
  return `tile_meta_${tile.z}_${tile.x}_${tile.y}`
}

/**
 * Save tile metadata to IndexedDB
 */
export async function saveTileMetadata(
  tile: TileCoord,
  format: CompressionFormat,
  profile: CompressionProfile,
  originalSize: number,
  compressedSize: number,
  compressionRatio: number
): Promise<void> {
  const key = getMetadataKey(tile)
  const metadata: TileMetadata = {
    tileKey: `tile_${tile.z}_${tile.x}_${tile.y}`,
    format,
    profile,
    originalSize,
    compressedSize,
    compressionRatio,
    compressedAt: new Date().toISOString(),
  }

  await set(key, metadata)
}

/**
 * Get tile metadata from IndexedDB
 */
export async function getTileMetadata(tile: TileCoord): Promise<TileMetadata | null> {
  const key = getMetadataKey(tile)
  return (await get<TileMetadata>(key)) || null
}

/**
 * Delete tile metadata from IndexedDB
 */
export async function deleteTileMetadata(tile: TileCoord): Promise<void> {
  const key = getMetadataKey(tile)
  await del(key)
}

/**
 * Get metadata for multiple tiles
 */
export async function getTilesMetadata(tiles: TileCoord[]): Promise<Map<string, TileMetadata>> {
  const metadataMap = new Map<string, TileMetadata>()

  await Promise.all(
    tiles.map(async (tile) => {
      const metadata = await getTileMetadata(tile)
      if (metadata) {
        metadataMap.set(metadata.tileKey, metadata)
      }
    })
  )

  return metadataMap
}

/**
 * Calculate compression statistics for a set of tiles
 */
export async function getCompressionStats(tiles: TileCoord[]): Promise<{
  totalOriginalSize: number
  totalCompressedSize: number
  averageCompressionRatio: number
  tilesWithMetadata: number
}> {
  let totalOriginalSize = 0
  let totalCompressedSize = 0
  let tilesWithMetadata = 0

  await Promise.all(
    tiles.map(async (tile) => {
      const metadata = await getTileMetadata(tile)
      if (metadata) {
        totalOriginalSize += metadata.originalSize
        totalCompressedSize += metadata.compressedSize
        tilesWithMetadata++
      }
    })
  )

  const averageCompressionRatio =
    tilesWithMetadata > 0 ? totalCompressedSize / totalOriginalSize : 1.0

  return {
    totalOriginalSize,
    totalCompressedSize,
    averageCompressionRatio,
    tilesWithMetadata,
  }
}
