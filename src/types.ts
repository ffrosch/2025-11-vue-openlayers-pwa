export interface MapConfig {
  center: [number, number]
  zoom: number
}

export interface MapViewOptions {
  center: [number, number]
  zoom: number
  projection?: string
}

export interface TileCoord {
  z: number // zoom level
  x: number // tile X coordinate
  y: number // tile Y coordinate
}

export interface BoundingBox {
  west: number // min longitude
  south: number // min latitude
  east: number // max longitude
  north: number // max latitude
}

export interface DownloadedArea {
  id: string
  name: string
  bbox: BoundingBox
  baseZoom: number
  additionalZoomLevels: number
  minZoom: number
  maxZoom: number
  tileCount: number
  sizeBytes: number
  downloadedAt: string // ISO 8601 string
  tileUrlTemplate: string
  // Compression stats (optional for backward compatibility)
  compressionEnabled?: boolean
  compressionProfile?: CompressionProfile
  originalSizeBytes?: number // Uncompressed size
  compressionRatio?: number // Average compression ratio
}

export interface DownloadProgress {
  areaId: string
  total: number
  downloaded: number
  failed: number
  percentage: number
  currentTile?: TileCoord
  estimatedTimeRemaining?: number // milliseconds
  bytesDownloaded: number
  startTime?: number // timestamp for speed calculation
  isComplete: boolean
  isCancelled: boolean
}

export interface StorageQuota {
  usage: number // bytes used
  quota: number // total quota
  available: number // remaining
  percentUsed: number
  isPersisted: boolean
}

export type CompressionFormat = 'webp' | 'jpeg' | 'png'

export type CompressionProfile = 'high' | 'balanced' | 'aggressive'

export interface CompressionProfileConfig {
  quality: number // 0-1 for JPEG/WebP
  targetCompressionRatio: number // Expected ratio (e.g., 0.5 = 50% reduction)
}

export interface CompressedTile {
  blob: Blob
  format: CompressionFormat
  profile: CompressionProfile
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

export interface TileMetadata {
  tileKey: string // tile_${z}_${x}_${y}
  format: CompressionFormat
  profile: CompressionProfile
  originalSize: number
  compressedSize: number
  compressionRatio: number
  compressedAt: string // ISO 8601 string
}

export interface CompressionSettings {
  defaultProfile: CompressionProfile
  cacheProfile: CompressionProfile // Always 'high' for cached tiles
}
