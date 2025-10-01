import { beforeEach } from 'vitest'
import 'fake-indexeddb/auto'

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
