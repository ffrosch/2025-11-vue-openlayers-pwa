import type { TileCoord, BoundingBox } from '@/types'

/**
 * Convert longitude/latitude to tile coordinates at a given zoom level
 * Uses Web Mercator projection (EPSG:3857)
 */
export function lonLatToTile(
  lon: number,
  lat: number,
  zoom: number
): { x: number; y: number } {
  // Normalize longitude to -180..180 range
  while (lon > 180) lon -= 360
  while (lon < -180) lon += 360

  // Clamp latitude to valid Web Mercator range (-85.05..85.05)
  lat = Math.max(-85.0511, Math.min(85.0511, lat))

  // Calculate tile X coordinate
  // Handle edge case: lon = 180 should wrap to tile 0 at the next power of 2
  const numTiles = Math.pow(2, zoom)
  let x = Math.floor(((lon + 180) / 360) * numTiles)

  // Ensure x is within valid range [0, numTiles)
  if (x >= numTiles) x = numTiles - 1
  if (x < 0) x = 0

  // Calculate tile Y coordinate using Mercator projection
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      numTiles
  )

  return { x, y }
}

/**
 * Get all tiles within a bounding box at a specific zoom level
 */
export function getTilesInExtent(bbox: BoundingBox, zoom: number): TileCoord[] {
  // Validate bounding box
  if (bbox.west > bbox.east) {
    throw new Error(
      'Invalid bounding box: west longitude must be less than or equal to east longitude'
    )
  }

  // Get tile coordinates for corners
  const topLeft = lonLatToTile(bbox.west, bbox.north, zoom)
  const bottomRight = lonLatToTile(bbox.east, bbox.south, zoom)

  const tiles: TileCoord[] = []

  // Iterate through all tiles in the bounding box
  for (let x = topLeft.x; x <= bottomRight.x; x++) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      tiles.push({ z: zoom, x, y })
    }
  }

  return tiles
}

/**
 * Calculate list of all tiles to download for a bounding box and zoom range
 */
export function calculateDownloadList(
  bbox: BoundingBox,
  baseZoom: number,
  additionalLevels: number
): TileCoord[] {
  const allTiles: TileCoord[] = []
  const maxZoom = baseZoom + additionalLevels

  // Collect tiles for each zoom level
  for (let z = baseZoom; z <= maxZoom; z++) {
    const tilesAtZoom = getTilesInExtent(bbox, z)
    allTiles.push(...tilesAtZoom)
  }

  return allTiles
}

/**
 * Estimate download size in bytes based on tile count
 * Assumes average tile size of 20KB (typical for OSM PNG tiles)
 */
export function estimateDownloadSize(tiles: TileCoord[]): number {
  const avgTileSizeBytes = 20 * 1024 // 20 KB
  return tiles.length * avgTileSizeBytes
}
