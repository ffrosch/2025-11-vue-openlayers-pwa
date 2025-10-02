import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStorageQuota } from '@/composables/useStorageQuota'

describe('useStorageQuota', () => {
  describe('updateStorageInfo', () => {
    it('should return StorageQuota with usage, quota, available, percentUsed', async () => {
      const { updateStorageInfo, storageInfo } = useStorageQuota()

      await updateStorageInfo()

      expect(storageInfo.value.usage).toBe(1024 * 1024 * 50) // 50 MB
      expect(storageInfo.value.quota).toBe(1024 * 1024 * 500) // 500 MB
      expect(storageInfo.value.available).toBe(1024 * 1024 * 450) // 450 MB
      expect(storageInfo.value.percentUsed).toBeCloseTo(10, 1) // 10%
    })

    it('should calculate percentUsed correctly: (usage / quota) × 100', async () => {
      const { updateStorageInfo, storageInfo } = useStorageQuota()

      await updateStorageInfo()

      const expectedPercent = (storageInfo.value.usage / storageInfo.value.quota) * 100
      expect(storageInfo.value.percentUsed).toBeCloseTo(expectedPercent, 2)
    })

    it('should handle browser without Storage API', async () => {
      // Temporarily remove storage API
      const originalStorage = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        configurable: true,
      })

      const { updateStorageInfo, storageInfo, isStorageSupported } = useStorageQuota()

      expect(isStorageSupported.value).toBe(false)
      await updateStorageInfo()

      // Should return default/zero values
      expect(storageInfo.value.usage).toBe(0)
      expect(storageInfo.value.quota).toBe(0)

      // Restore
      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
      })
    })

    it('should show 25% used when quota is 1GB and usage is 250MB', async () => {
      // Mock different quota
      const originalEstimate = navigator.storage.estimate
      navigator.storage.estimate = vi.fn().mockResolvedValue({
        usage: 250 * 1024 * 1024, // 250 MB
        quota: 1024 * 1024 * 1024, // 1 GB
      })

      const { updateStorageInfo, storageInfo } = useStorageQuota()

      await updateStorageInfo()

      expect(storageInfo.value.usage).toBe(250 * 1024 * 1024)
      expect(storageInfo.value.quota).toBe(1024 * 1024 * 1024)
      expect(storageInfo.value.percentUsed).toBeCloseTo(24.41, 1) // ~24.41%
      expect(storageInfo.value.available).toBe(774 * 1024 * 1024)

      // Restore
      navigator.storage.estimate = originalEstimate
    })
  })

  describe('requestPersistence', () => {
    it('should return true when persistence granted', async () => {
      // Mock persisted() to return true after persist() is called
      const originalPersisted = navigator.storage.persisted
      navigator.storage.persisted = vi.fn().mockResolvedValue(true)

      const { requestPersistence, storageInfo } = useStorageQuota()

      const result = await requestPersistence()

      expect(result).toBe(true)
      expect(storageInfo.value.isPersisted).toBe(true)

      // Restore
      navigator.storage.persisted = originalPersisted
    })

    it('should return false when persistence denied', async () => {
      // Mock persistence denial
      const originalPersist = navigator.storage.persist
      navigator.storage.persist = vi.fn().mockResolvedValue(false)

      const { requestPersistence } = useStorageQuota()

      const result = await requestPersistence()

      expect(result).toBe(false)

      // Restore
      navigator.storage.persist = originalPersist
    })

    it('should return false gracefully when browser does not support persist API', async () => {
      // Remove persist method
      const originalStorage = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: originalStorage.estimate,
          // No persist method
        },
        configurable: true,
      })

      const { requestPersistence } = useStorageQuota()

      const result = await requestPersistence()

      expect(result).toBe(false)

      // Restore
      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
      })
    })
  })
})
