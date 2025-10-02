import { describe, it, expect } from 'vitest'
import {
  saveTileMetadata,
  getTileMetadata,
  deleteTileMetadata,
  getTilesMetadata,
  getCompressionStats,
} from '@/services/tileMetadata'
import type { TileCoord } from '@/types'

describe('tileMetadata', () => {
  const testTile: TileCoord = { z: 10, x: 100, y: 200 }
  const testTile2: TileCoord = { z: 10, x: 101, y: 200 }

  describe('saveTileMetadata', () => {
    it('should save tile metadata', async () => {
      await saveTileMetadata(testTile, 'webp', 'high', 20000, 10000, 0.5)

      const metadata = await getTileMetadata(testTile)

      expect(metadata).toBeDefined()
      expect(metadata?.tileKey).toBe('tile_10_100_200')
      expect(metadata?.format).toBe('webp')
      expect(metadata?.profile).toBe('high')
      expect(metadata?.originalSize).toBe(20000)
      expect(metadata?.compressedSize).toBe(10000)
      expect(metadata?.compressionRatio).toBe(0.5)
      expect(metadata?.compressedAt).toBeDefined()
    })

    it('should update existing metadata', async () => {
      await saveTileMetadata(testTile, 'webp', 'high', 20000, 10000, 0.5)
      await saveTileMetadata(testTile, 'jpeg', 'balanced', 20000, 14000, 0.7)

      const metadata = await getTileMetadata(testTile)

      expect(metadata?.format).toBe('jpeg')
      expect(metadata?.profile).toBe('balanced')
      expect(metadata?.compressedSize).toBe(14000)
    })
  })

  describe('getTileMetadata', () => {
    it('should return null for non-existent metadata', async () => {
      const metadata = await getTileMetadata({ z: 99, x: 99, y: 99 })

      expect(metadata).toBeNull()
    })

    it('should return saved metadata', async () => {
      await saveTileMetadata(testTile, 'webp', 'aggressive', 20000, 16000, 0.8)

      const metadata = await getTileMetadata(testTile)

      expect(metadata).toBeDefined()
      expect(metadata?.profile).toBe('aggressive')
    })
  })

  describe('deleteTileMetadata', () => {
    it('should delete tile metadata', async () => {
      await saveTileMetadata(testTile, 'webp', 'high', 20000, 10000, 0.5)

      await deleteTileMetadata(testTile)

      const metadata = await getTileMetadata(testTile)
      expect(metadata).toBeNull()
    })
  })

  describe('getTilesMetadata', () => {
    it('should return metadata for multiple tiles', async () => {
      await saveTileMetadata(testTile, 'webp', 'high', 20000, 10000, 0.5)
      await saveTileMetadata(testTile2, 'jpeg', 'balanced', 20000, 14000, 0.7)

      const metadataMap = await getTilesMetadata([testTile, testTile2])

      expect(metadataMap.size).toBe(2)
      expect(metadataMap.get('tile_10_100_200')?.format).toBe('webp')
      expect(metadataMap.get('tile_10_101_200')?.format).toBe('jpeg')
    })

    it('should return empty map for tiles without metadata', async () => {
      const metadataMap = await getTilesMetadata([
        { z: 99, x: 99, y: 99 },
        { z: 98, x: 98, y: 98 },
      ])

      expect(metadataMap.size).toBe(0)
    })

    it('should include only tiles with metadata', async () => {
      await saveTileMetadata(testTile, 'webp', 'high', 20000, 10000, 0.5)

      const metadataMap = await getTilesMetadata([testTile, { z: 99, x: 99, y: 99 }])

      expect(metadataMap.size).toBe(1)
      expect(metadataMap.has('tile_10_100_200')).toBe(true)
    })
  })

  describe('getCompressionStats', () => {
    it('should calculate stats for single tile', async () => {
      await saveTileMetadata(testTile, 'webp', 'high', 20000, 10000, 0.5)

      const stats = await getCompressionStats([testTile])

      expect(stats.totalOriginalSize).toBe(20000)
      expect(stats.totalCompressedSize).toBe(10000)
      expect(stats.averageCompressionRatio).toBe(0.5)
      expect(stats.tilesWithMetadata).toBe(1)
    })

    it('should calculate stats for multiple tiles', async () => {
      await saveTileMetadata(testTile, 'webp', 'high', 20000, 10000, 0.5)
      await saveTileMetadata(testTile2, 'jpeg', 'balanced', 20000, 14000, 0.7)

      const stats = await getCompressionStats([testTile, testTile2])

      expect(stats.totalOriginalSize).toBe(40000)
      expect(stats.totalCompressedSize).toBe(24000)
      expect(stats.averageCompressionRatio).toBe(0.6) // 24000/40000
      expect(stats.tilesWithMetadata).toBe(2)
    })

    it('should return zeros for tiles without metadata', async () => {
      const stats = await getCompressionStats([{ z: 99, x: 99, y: 99 }])

      expect(stats.totalOriginalSize).toBe(0)
      expect(stats.totalCompressedSize).toBe(0)
      expect(stats.averageCompressionRatio).toBe(1.0) // Default when no tiles
      expect(stats.tilesWithMetadata).toBe(0)
    })

    it('should handle mix of tiles with and without metadata', async () => {
      await saveTileMetadata(testTile, 'webp', 'high', 20000, 10000, 0.5)

      const stats = await getCompressionStats([testTile, { z: 99, x: 99, y: 99 }])

      expect(stats.totalOriginalSize).toBe(20000)
      expect(stats.totalCompressedSize).toBe(10000)
      expect(stats.tilesWithMetadata).toBe(1)
    })
  })
})
