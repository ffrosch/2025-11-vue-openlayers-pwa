import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get, set, del, keys, clear } from 'idb-keyval'
import { downloadTile, downloadTiles, getTileFromStorage, saveTileToStorage, deleteTileFromStorage, getAllStoredTileKeys } from '@/services/tileDownloader'
import { createMockTile, createMockTileBlob } from '../../helpers/mockTiles'
import type { TileCoord } from '@/types'

describe('tileDownloader', () => {
  beforeEach(async () => {
    // Clear all stored tiles before each test
    await clear()
  })

  describe('getTileFromStorage', () => {
    it('should return Blob when tile exists in storage', async () => {
      const tile = createMockTile(8, 100, 50)
      const blob = createMockTileBlob()
      const key = `tile_${tile.z}_${tile.x}_${tile.y}`

      // Store a tile
      await set(key, { data: blob, storedAt: new Date().toISOString() })

      const result = await getTileFromStorage(tile)

      expect(result).toBeDefined()
      // Note: fake-indexeddb serializes Blobs as plain objects, so we check for truthy instead
      expect(result).toBeTruthy()
    })

    it('should return null when tile does not exist', async () => {
      const tile = createMockTile(8, 100, 50)

      const result = await getTileFromStorage(tile)

      expect(result).toBeNull()
    })

    it('should use correct key format: tile_z_x_y', async () => {
      const tile = createMockTile(10, 512, 256)
      const blob = createMockTileBlob()
      const key = 'tile_10_512_256'

      await set(key, { data: blob, storedAt: new Date().toISOString() })

      const result = await getTileFromStorage(tile)

      expect(result).toBeDefined()
    })
  })

  describe('saveTileToStorage', () => {
    it('should store tile with correct key format', async () => {
      const tile = createMockTile(8, 100, 50)
      const blob = createMockTileBlob()

      await saveTileToStorage(tile, blob)

      const key = 'tile_8_100_50'
      const stored = await get(key)

      expect(stored).toBeDefined()
      expect(stored).toHaveProperty('data')
      expect(stored).toHaveProperty('storedAt')
    })

    it('should store blob data that can be retrieved', async () => {
      const tile = createMockTile(8, 100, 50)
      const blob = createMockTileBlob()

      await saveTileToStorage(tile, blob)

      const retrieved = await getTileFromStorage(tile)

      expect(retrieved).toBeDefined()
      // Note: fake-indexeddb serializes Blobs as plain objects, so we check for truthy instead
      expect(retrieved).toBeTruthy()
    })

    it('should overwrite existing tile if called twice', async () => {
      const tile = createMockTile(8, 100, 50)
      const blob1 = createMockTileBlob()
      const blob2 = createMockTileBlob()

      await saveTileToStorage(tile, blob1)
      await saveTileToStorage(tile, blob2)

      const key = 'tile_8_100_50'
      const allKeys = await keys()

      // Should only have one entry for this tile
      const tileKeys = allKeys.filter((k) => k === key)
      expect(tileKeys.length).toBe(1)
    })
  })

  describe('deleteTileFromStorage', () => {
    it('should delete an existing tile', async () => {
      const tile = createMockTile(8, 100, 50)
      const blob = createMockTileBlob()

      await saveTileToStorage(tile, blob)
      await deleteTileFromStorage(tile)

      const result = await getTileFromStorage(tile)

      expect(result).toBeNull()
    })

    it('should not throw error when deleting non-existent tile', async () => {
      const tile = createMockTile(8, 100, 50)

      await expect(deleteTileFromStorage(tile)).resolves.not.toThrow()
    })
  })

  describe('getAllStoredTileKeys', () => {
    it('should return empty array when no tiles stored', async () => {
      const result = await getAllStoredTileKeys()

      expect(result).toEqual([])
    })

    it('should return array of all stored tile keys', async () => {
      const tile1 = createMockTile(8, 100, 50)
      const tile2 = createMockTile(8, 101, 50)
      const tile3 = createMockTile(9, 200, 100)
      const blob = createMockTileBlob()

      await saveTileToStorage(tile1, blob)
      await saveTileToStorage(tile2, blob)
      await saveTileToStorage(tile3, blob)

      const result = await getAllStoredTileKeys()

      expect(result).toHaveLength(3)
      expect(result).toContain('tile_8_100_50')
      expect(result).toContain('tile_8_101_50')
      expect(result).toContain('tile_9_200_100')
    })

    it('should only return tile keys, not other stored data', async () => {
      const tile = createMockTile(8, 100, 50)
      const blob = createMockTileBlob()

      await saveTileToStorage(tile, blob)
      await set('some_other_key', { data: 'test' })

      const result = await getAllStoredTileKeys()

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('tile_8_100_50')
    })
  })

  describe('downloadTile', () => {
    it('should download tile from URL and return Blob', async () => {
      const tile = createMockTile(8, 100, 50)
      const urlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => createMockTileBlob(),
      })

      const result = await downloadTile(tile, urlTemplate)

      expect(result).toBeInstanceOf(Blob)
      expect(global.fetch).toHaveBeenCalledWith('https://tile.openstreetmap.org/8/100/50.png')
    })

    it('should throw error when fetch fails', async () => {
      const tile = createMockTile(8, 100, 50)
      const urlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

      // Mock failed fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      await expect(downloadTile(tile, urlTemplate)).rejects.toThrow()
    })

    it('should replace {z}, {x}, {y} placeholders in URL template', async () => {
      const tile = createMockTile(12, 2048, 1024)
      const urlTemplate = 'https://example.com/{z}/{x}/{y}.png'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => createMockTileBlob(),
      })

      await downloadTile(tile, urlTemplate)

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/12/2048/1024.png')
    })
  })

  describe('downloadTiles', () => {
    it('should download multiple tiles and save to storage', async () => {
      const tiles: TileCoord[] = [
        createMockTile(8, 100, 50),
        createMockTile(8, 101, 50),
        createMockTile(8, 102, 50),
      ]
      const urlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => createMockTileBlob(),
      })

      const onProgress = vi.fn()

      await downloadTiles(tiles, urlTemplate, onProgress)

      // Check all tiles were stored
      const stored1 = await getTileFromStorage(tiles[0])
      const stored2 = await getTileFromStorage(tiles[1])
      const stored3 = await getTileFromStorage(tiles[2])

      expect(stored1).toBeDefined()
      expect(stored2).toBeDefined()
      expect(stored3).toBeDefined()

      // Check progress callback was called
      expect(onProgress).toHaveBeenCalled()
    })

    it('should handle partial failures gracefully', async () => {
      const tiles: TileCoord[] = [
        createMockTile(8, 100, 50),
        createMockTile(8, 101, 50),
        createMockTile(8, 102, 50),
      ]
      const urlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

      let callCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 2) {
          // Second tile fails
          return Promise.resolve({ ok: false, status: 404 })
        }
        return Promise.resolve({
          ok: true,
          blob: async () => createMockTileBlob(),
        })
      })

      const onProgress = vi.fn()

      await downloadTiles(tiles, urlTemplate, onProgress)

      // First and third tiles should be stored
      const stored1 = await getTileFromStorage(tiles[0])
      const stored3 = await getTileFromStorage(tiles[2])

      expect(stored1).toBeDefined()
      expect(stored3).toBeDefined()

      // Second tile should not be stored
      const stored2 = await getTileFromStorage(tiles[1])
      expect(stored2).toBeNull()
    })

    it('should report progress with downloaded count and failed count', async () => {
      const tiles: TileCoord[] = [
        createMockTile(8, 100, 50),
        createMockTile(8, 101, 50),
      ]
      const urlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => createMockTileBlob(),
      })

      const onProgress = vi.fn()

      await downloadTiles(tiles, urlTemplate, onProgress)

      // Progress callback should be called with download stats
      expect(onProgress).toHaveBeenCalled()
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0]
      expect(lastCall).toHaveProperty('downloaded')
      expect(lastCall).toHaveProperty('failed')
      expect(lastCall).toHaveProperty('total')
    })
  })
})
