import { describe, it, expect } from 'vitest'
import {
  lonLatToTile,
  getTilesInExtent,
  calculateDownloadList,
  estimateDownloadSize,
} from '@/services/tileCalculator'
import type { BoundingBox } from '@/types'

describe('tileCalculator', () => {
  describe('lonLatToTile', () => {
    it('should convert (0°, 0°) at zoom 0 to tile (0, 0)', () => {
      const result = lonLatToTile(0, 0, 0)
      expect(result).toEqual({ x: 0, y: 0 })
    })

    it('should convert (180°, 85°) at zoom 1 to tile (1, 0) [edge case]', () => {
      // 180° is the edge of the world, wraps to rightmost tile
      const result = lonLatToTile(180, 85, 1)
      expect(result.x).toBe(1) // At zoom 1, tiles 0-1, 180° maps to tile 1 (rightmost)
      expect(result.y).toBe(0)
    })

    it('should convert (-180°, -85°) at zoom 1 to tile (0, 1)', () => {
      const result = lonLatToTile(-180, -85, 1)
      expect(result.x).toBe(0)
      expect(result.y).toBe(1)
    })

    it('should convert Stuttgart (9.18°E, 48.77°N) at zoom 10 to correct tile', () => {
      const result = lonLatToTile(9.18, 48.77, 10)
      // Verify coordinates are in reasonable range for Stuttgart
      expect(result.x).toBeGreaterThan(535)
      expect(result.x).toBeLessThan(540)
      expect(result.y).toBeGreaterThan(345)
      expect(result.y).toBeLessThan(355)
    })

    it('should produce large tile numbers at zoom 18', () => {
      const result = lonLatToTile(9.18, 48.77, 18)
      expect(result.x).toBeGreaterThan(137000)
      expect(result.y).toBeGreaterThan(88000)
    })

    it('should handle latitude > 90° by clamping', () => {
      const result = lonLatToTile(0, 100, 5)
      // Should clamp to valid latitude range
      expect(result.y).toBeGreaterThanOrEqual(0)
      expect(result.y).toBeLessThan(Math.pow(2, 5))
    })

    it('should normalize longitude wrapping (370° = 10°)', () => {
      const result1 = lonLatToTile(10, 0, 5)
      const result2 = lonLatToTile(370, 0, 5)
      expect(result1).toEqual(result2)
    })
  })

  describe('getTilesInExtent', () => {
    it('should return ~4 tiles for small bbox (1°×1°) at zoom 8', () => {
      const bbox: BoundingBox = {
        west: 9.0,
        south: 48.0,
        east: 10.0,
        north: 49.0,
      }
      const tiles = getTilesInExtent(bbox, 8)
      expect(tiles.length).toBeGreaterThanOrEqual(2)
      expect(tiles.length).toBeLessThanOrEqual(6)
    })

    it('should return multiple tiles for Baden-Württemberg at zoom 8', () => {
      const bbox: BoundingBox = {
        west: 7.5,
        south: 47.5,
        east: 10.5,
        north: 49.8,
      }
      const tiles = getTilesInExtent(bbox, 8)
      // Baden-Württemberg is about 3°×2.3° which should give us multiple tiles
      expect(tiles.length).toBeGreaterThan(5)
      expect(tiles.length).toBeLessThan(50)
    })

    it('should return 1 tile for exact tile bounds', () => {
      // Calculate exact tile bounds for a single tile
      const bbox: BoundingBox = {
        west: 9.0,
        south: 48.0,
        east: 9.001,
        north: 48.001,
      }
      const tiles = getTilesInExtent(bbox, 8)
      expect(tiles.length).toBe(1)
    })

    it('should handle bbox crossing date line (-170° to 170°)', () => {
      const bbox: BoundingBox = {
        west: -170,
        south: 0,
        east: 170,
        north: 10,
      }
      const tiles = getTilesInExtent(bbox, 2)
      expect(tiles.length).toBeGreaterThan(0)
      // Should span across date line
      expect(tiles.some((t) => t.x === 0)).toBe(true)
    })

    it('should handle bbox at high latitudes (lat > 85°)', () => {
      const bbox: BoundingBox = {
        west: -10,
        south: 85,
        east: 10,
        north: 89,
      }
      const tiles = getTilesInExtent(bbox, 5)
      expect(tiles.length).toBeGreaterThan(0)
      expect(tiles.every((t) => t.y >= 0)).toBe(true)
    })

    it('should return 1 tile for empty bbox (west=east, north=south)', () => {
      const bbox: BoundingBox = {
        west: 9.0,
        south: 48.0,
        east: 9.0,
        north: 48.0,
      }
      const tiles = getTilesInExtent(bbox, 8)
      expect(tiles.length).toBe(1)
    })

    it('should throw error for inverted bbox (west > east)', () => {
      const bbox: BoundingBox = {
        west: 10.0,
        south: 48.0,
        east: 9.0,
        north: 49.0,
      }
      expect(() => getTilesInExtent(bbox, 8)).toThrow()
    })
  })

  describe('calculateDownloadList', () => {
    const smallBbox: BoundingBox = {
      west: 9.0,
      south: 48.0,
      east: 10.0,
      north: 49.0,
    }

    it('should return only baseZoom tiles when additionalLevels = 0', () => {
      const tiles = calculateDownloadList(smallBbox, 8, 0)
      expect(tiles.every((t) => t.z === 8)).toBe(true)
    })

    it('should return tiles for baseZoom + 3 levels', () => {
      const tiles = calculateDownloadList(smallBbox, 8, 3)
      const uniqueZooms = [...new Set(tiles.map((t) => t.z))].sort((a, b) => a - b)
      expect(uniqueZooms).toEqual([8, 9, 10, 11])
    })

    it('should have tile count increase ~4× per zoom level', () => {
      const tiles8 = calculateDownloadList(smallBbox, 8, 0)
      const tiles9 = calculateDownloadList(smallBbox, 9, 0)

      // Tiles increase by factor of 4 per zoom level (quadtree)
      // With small bboxes, the ratio might be less than 4 due to rounding
      const ratio = tiles9.length / tiles8.length
      expect(ratio).toBeGreaterThanOrEqual(2)
      expect(ratio).toBeLessThanOrEqual(6)
    })

    it('should not have duplicate tiles', () => {
      const tiles = calculateDownloadList(smallBbox, 8, 2)
      const keys = tiles.map((t) => `${t.z}_${t.x}_${t.y}`)
      const uniqueKeys = new Set(keys)
      expect(keys.length).toBe(uniqueKeys.size)
    })

    it('should return tiles sorted by zoom level (optional)', () => {
      const tiles = calculateDownloadList(smallBbox, 8, 2)
      // Check if tiles are generally sorted by zoom
      // (Implementation may choose to sort or not)
      const zooms = tiles.map((t) => t.z)
      expect(Math.min(...zooms)).toBe(8)
      expect(Math.max(...zooms)).toBe(10)
    })
  })

  describe('estimateDownloadSize', () => {
    it('should estimate 100 tiles × 20KB = ~2MB', () => {
      const tiles = Array(100).fill({ z: 8, x: 100, y: 50 })
      const size = estimateDownloadSize(tiles)
      expect(size).toBe(100 * 20 * 1024) // 2,048,000 bytes
    })

    it('should return 0 bytes for 0 tiles', () => {
      const size = estimateDownloadSize([])
      expect(size).toBe(0)
    })

    it('should estimate 1 tile = 20KB', () => {
      const tiles = [{ z: 8, x: 100, y: 50 }]
      const size = estimateDownloadSize(tiles)
      expect(size).toBe(20 * 1024) // 20,480 bytes
    })
  })
})
