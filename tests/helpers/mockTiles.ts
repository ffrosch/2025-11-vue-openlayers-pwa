import type { TileCoord, BoundingBox, DownloadedArea } from '@/types'

/**
 * Generate a test tile blob (1x1 transparent PNG)
 */
export function createMockTileBlob(): Blob {
  // 1x1 transparent PNG (base64)
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: 'image/png' })
}

/**
 * Generate mock tile coordinates
 */
export function createMockTile(z = 8, x = 100, y = 50): TileCoord {
  return { z, x, y }
}

/**
 * Generate mock bounding box (small area near Stuttgart)
 */
export function createMockBoundingBox(): BoundingBox {
  return {
    west: 9.0,
    south: 48.5,
    east: 9.5,
    north: 49.0,
  }
}

/**
 * Generate mock downloaded area
 */
export function createMockDownloadedArea(
  overrides: Partial<DownloadedArea> = {}
): DownloadedArea {
  return {
    id: crypto.randomUUID(),
    name: 'Test Area',
    bbox: createMockBoundingBox(),
    baseZoom: 8,
    additionalZoomLevels: 2,
    minZoom: 8,
    maxZoom: 10,
    tileCount: 100,
    sizeBytes: 2048000, // ~2 MB
    downloadedAt: new Date().toISOString(),
    tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    ...overrides,
  }
}

/**
 * Generate array of mock tiles
 */
export function createMockTiles(count: number): TileCoord[] {
  const tiles: TileCoord[] = []
  for (let i = 0; i < count; i++) {
    tiles.push({
      z: 8,
      x: 100 + (i % 10),
      y: 50 + Math.floor(i / 10),
    })
  }
  return tiles
}
