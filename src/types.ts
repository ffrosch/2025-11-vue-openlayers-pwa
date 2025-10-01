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
  downloadedAt: Date
  tileUrlTemplate: string
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
