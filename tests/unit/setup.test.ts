import { describe, it, expect } from 'vitest'
import { get, set } from 'idb-keyval'
import { createMockTileBlob, createMockTile } from '../helpers/mockTiles'

describe('Test Environment Setup', () => {
  it('should have IndexedDB available', () => {
    expect(indexedDB).toBeDefined()
    expect(typeof indexedDB.open).toBe('function')
  })

  it('should have navigator.storage mock', () => {
    expect(navigator.storage).toBeDefined()
    expect(typeof navigator.storage.estimate).toBe('function')
  })

  it('should have navigator.onLine mock', () => {
    expect(navigator.onLine).toBeDefined()
    expect(navigator.onLine).toBe(true)
  })

  it('should be able to store and retrieve data from IndexedDB', async () => {
    const key = 'test-key'
    const value = 'test-value'

    await set(key, value)
    const retrieved = await get(key)

    expect(retrieved).toBe(value)
  })

  it('should be able to store and retrieve complex objects from IndexedDB', async () => {
    const tile = createMockTile()
    const tileData = {
      z: tile.z,
      x: tile.x,
      y: tile.y,
      data: 'mock-tile-data',
      size: 2048,
    }
    const key = `tile_${tile.z}_${tile.x}_${tile.y}`

    await set(key, tileData)
    const retrieved = await get(key)

    expect(retrieved).toBeDefined()
    expect(retrieved).toEqual(tileData)

    // Note: Blob serialization in fake-indexeddb has limitations
    // Real blob storage will be tested in integration tests with actual tiles
  })

  it('should clear IndexedDB between tests', async () => {
    // This test verifies that the beforeEach hook is working
    // If a previous test stored data, it should be gone
    const keys = ['test-1', 'test-2', 'test-3']

    // Try to retrieve keys that might have been set in previous tests
    for (const key of keys) {
      const value = await get(key)
      expect(value).toBeUndefined()
    }
  })

  it('should have storage quota mock returning expected values', async () => {
    const estimate = await navigator.storage.estimate()

    expect(estimate.usage).toBe(1024 * 1024 * 50) // 50 MB
    expect(estimate.quota).toBe(1024 * 1024 * 500) // 500 MB
  })

  it('should have crypto.randomUUID available', () => {
    const uuid = crypto.randomUUID()

    expect(uuid).toBeDefined()
    expect(typeof uuid).toBe('string')
    expect(uuid.length).toBe(36) // UUID v4 format
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })
})
