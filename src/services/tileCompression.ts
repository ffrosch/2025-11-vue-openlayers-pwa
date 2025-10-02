import type {
  CompressionFormat,
  CompressionProfile,
  CompressionProfileConfig,
  CompressedTile,
} from '@/types'

/**
 * Compression profile configurations
 * quality: 0-1 for JPEG/WebP compression
 * targetCompressionRatio: expected compression ratio (e.g., 0.5 = 50% size reduction)
 */
export const COMPRESSION_PROFILES: Record<CompressionProfile, CompressionProfileConfig> = {
  high: {
    quality: 0.92,
    targetCompressionRatio: 0.5, // ~50% compression
  },
  balanced: {
    quality: 0.85,
    targetCompressionRatio: 0.7, // ~70% compression
  },
  aggressive: {
    quality: 0.75,
    targetCompressionRatio: 0.8, // ~80% compression
  },
}

/**
 * Detect browser support for WebP format
 * Uses canvas.toBlob() capability check
 */
export async function detectWebPSupport(): Promise<boolean> {
  if (typeof document === 'undefined') return false

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1

    canvas.toBlob(
      (blob) => {
        resolve(blob !== null)
      },
      'image/webp'
    )
  })
}

/**
 * Detect the best compression format for the current browser
 */
export async function detectBestCompressionFormat(): Promise<CompressionFormat> {
  const supportsWebP = await detectWebPSupport()
  return supportsWebP ? 'webp' : 'jpeg'
}

/**
 * Load blob into an Image element
 */
async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise(async (resolve, reject) => {
    const img = new Image()

    // Convert blob to ArrayBuffer then to base64 data URL (works in both browser and Node.js)
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      )
      const dataUrl = `data:${blob.type};base64,${base64}`

      img.onload = () => {
        resolve(img)
      }

      img.onerror = () => {
        reject(new Error('Failed to load image from blob'))
      }

      img.src = dataUrl
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Convert image to canvas
 */
function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  ctx.drawImage(img, 0, 0)
  return canvas
}

/**
 * Convert canvas to compressed blob
 */
async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: CompressionFormat,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error(`Failed to convert canvas to ${format} blob`))
        }
      },
      `image/${format}`,
      quality
    )
  })
}

/**
 * Compress a tile blob using the specified format and profile
 */
export async function compressTile(
  originalBlob: Blob,
  format: CompressionFormat,
  profile: CompressionProfile
): Promise<CompressedTile> {
  const profileConfig = COMPRESSION_PROFILES[profile]
  const originalSize = originalBlob.size

  // If format is PNG, no compression needed
  if (format === 'png') {
    return {
      blob: originalBlob,
      format: 'png',
      profile,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
    }
  }

  // Load image from blob
  const img = await blobToImage(originalBlob)

  // Convert to canvas
  const canvas = imageToCanvas(img)

  // Compress using canvas.toBlob
  const compressedBlob = await canvasToBlob(canvas, format, profileConfig.quality)
  const compressedSize = compressedBlob.size
  const compressionRatio = compressedSize / originalSize

  return {
    blob: compressedBlob,
    format,
    profile,
    originalSize,
    compressedSize,
    compressionRatio,
  }
}

/**
 * Compress a tile with JPEG format
 */
export async function compressTileAsJPEG(
  blob: Blob,
  profile: CompressionProfile
): Promise<CompressedTile> {
  return compressTile(blob, 'jpeg', profile)
}

/**
 * Compress a tile with WebP format
 */
export async function compressTileAsWebP(
  blob: Blob,
  profile: CompressionProfile
): Promise<CompressedTile> {
  return compressTile(blob, 'webp', profile)
}

/**
 * Decompress a tile (actually just returns the blob since decompression is handled by browser)
 * This function exists for API consistency and future extensibility
 */
export async function decompressTile(
  compressedBlob: Blob,
  _format: CompressionFormat
): Promise<Blob> {
  // Browser handles decompression automatically when loading image
  // We just return the blob as-is
  return compressedBlob
}

/**
 * Compress tile using the best available format for the browser
 */
export async function compressTileAuto(
  blob: Blob,
  profile: CompressionProfile
): Promise<CompressedTile> {
  const format = await detectBestCompressionFormat()
  return compressTile(blob, format, profile)
}

/**
 * Get compression profile configuration
 */
export function getCompressionProfileConfig(
  profile: CompressionProfile
): CompressionProfileConfig {
  return COMPRESSION_PROFILES[profile]
}
