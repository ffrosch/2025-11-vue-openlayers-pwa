import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { StorageQuota } from '@/types'

export interface UseStorageQuotaReturn {
  storageInfo: Ref<StorageQuota>
  isStorageSupported: ComputedRef<boolean>
  updateStorageInfo: () => Promise<void>
  requestPersistence: () => Promise<boolean>
  formatBytes: (bytes: number) => string
}

export function useStorageQuota(): UseStorageQuotaReturn {
  const storageInfo = ref<StorageQuota>({
    usage: 0,
    quota: 0,
    available: 0,
    percentUsed: 0,
    isPersisted: false,
  })

  const isStorageSupported = computed(() => {
    return !!(navigator.storage && navigator.storage.estimate)
  })

  async function updateStorageInfo(): Promise<void> {
    if (!isStorageSupported.value) {
      return
    }

    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    const quota = estimate.quota || 0
    const available = quota - usage
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0

    let isPersisted = false
    if (navigator.storage.persisted) {
      isPersisted = await navigator.storage.persisted()
    }

    storageInfo.value = {
      usage,
      quota,
      available,
      percentUsed,
      isPersisted,
    }
  }

  async function requestPersistence(): Promise<boolean> {
    if (!navigator.storage || !navigator.storage.persist) {
      return false
    }

    const result = await navigator.storage.persist()
    await updateStorageInfo()
    return result
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return {
    storageInfo,
    isStorageSupported,
    updateStorageInfo,
    requestPersistence,
    formatBytes,
  }
}
