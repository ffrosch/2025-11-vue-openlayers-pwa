import { beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { Canvas, Image as CanvasImage } from 'canvas'

// Mock HTMLCanvasElement with node-canvas
global.HTMLCanvasElement.prototype.getContext = function (contextType: string) {
  if (contextType === '2d') {
    const canvas = new Canvas(this.width || 300, this.height || 150)
    return canvas.getContext('2d')
  }
  return null
}

// Mock toBlob for canvas
global.HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback, type = 'image/png', quality?: number) {
  try {
    const canvas = new Canvas(this.width || 300, this.height || 150)
    const ctx2d = this.getContext('2d') as unknown as CanvasRenderingContext2D

    // Copy image data if available
    if (ctx2d) {
      const nodeCanvas = canvas as unknown as { getContext: (type: string) => unknown }
      const nodeCtx = nodeCanvas.getContext('2d') as CanvasRenderingContext2D

      // Draw from original context to node canvas
      const imageData = ctx2d.getImageData?.(0, 0, this.width, this.height)
      if (imageData) {
        nodeCtx.putImageData(imageData, 0, 0)
      }
    }

    // Convert to blob
    const buffer = canvas.toBuffer(type as 'image/png' | 'image/jpeg', { quality })
    const blob = new Blob([buffer], { type })
    setTimeout(() => callback(blob), 0)
  } catch (error) {
    setTimeout(() => callback(null), 0)
  }
}

// Clear IndexedDB before each test
beforeEach(async () => {
  // Get all databases
  const dbs = await indexedDB.databases()

  // Delete each database
  for (const db of dbs) {
    if (db.name) {
      indexedDB.deleteDatabase(db.name)
    }
  }
})

// Mock navigator.storage API
Object.defineProperty(global.navigator, 'storage', {
  writable: true,
  configurable: true,
  value: {
    estimate: async () => ({
      usage: 1024 * 1024 * 50, // 50 MB used
      quota: 1024 * 1024 * 500, // 500 MB quota
    }),
    persist: async () => true,
    persisted: async () => false,
  },
})

// Mock navigator.onLine (can be overridden in individual tests)
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  configurable: true,
  value: true,
})

// Mock URL.createObjectURL and revokeObjectURL for blob handling
const objectURLMap = new Map<string, Blob>()
let objectURLCounter = 0

global.URL.createObjectURL = (blob: Blob) => {
  const url = `blob:http://localhost/${objectURLCounter++}`
  objectURLMap.set(url, blob)
  return url
}

global.URL.revokeObjectURL = (url: string) => {
  objectURLMap.delete(url)
}

// Helper to get blob from object URL (for testing)
;(global as unknown as { __getObjectURLBlob: (url: string) => Blob | undefined }).__getObjectURLBlob = (url: string) => objectURLMap.get(url)

// Mock Image class with canvas Image
global.Image = class extends CanvasImage {
  private _onload: ((this: GlobalEventHandlers, ev: Event) => any) | null = null
  private _onerror: OnErrorEventHandler | null = null

  constructor(width?: number, height?: number) {
    super(width, height)
  }

  set src(value: string) {
    // Handle data URLs
    if (value.startsWith('data:')) {
      const base64 = value.split(',')[1]
      if (base64) {
        try {
          const buffer = Buffer.from(base64, 'base64')
          // @ts-expect-error - node-canvas Image has src setter that accepts Buffer
          super.src = buffer
          // Trigger onload after setting src
          setTimeout(() => {
            if (this._onload) {
              this._onload.call(this, new Event('load'))
            }
          }, 0)
        } catch (error) {
          setTimeout(() => {
            if (this._onerror) {
              this._onerror.call(this, 'Error loading image', '', 0, 0, error as Error)
            }
          }, 0)
        }
      }
    }
  }

  get src(): string {
    // @ts-expect-error - node-canvas Image has src getter
    return super.src || ''
  }

  set onload(handler: ((this: GlobalEventHandlers, ev: Event) => any) | null) {
    this._onload = handler
  }

  get onload(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
    return this._onload
  }

  set onerror(handler: OnErrorEventHandler | null) {
    this._onerror = handler
  }

  get onerror(): OnErrorEventHandler | null {
    return this._onerror
  }
} as unknown as typeof Image

// Polyfill Blob.arrayBuffer for jsdom
if (typeof Blob.prototype.arrayBuffer === 'undefined') {
  Blob.prototype.arrayBuffer = async function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer)
      }
      reader.onerror = () => {
        reject(reader.error)
      }
      reader.readAsArrayBuffer(this)
    })
  }
}
