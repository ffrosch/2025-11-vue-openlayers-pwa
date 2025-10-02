/**
 * Platform detection utilities for iOS version, PWA status, and storage capabilities
 */

export interface PlatformInfo {
  isIOS: boolean
  isIOSVersion17OrHigher: boolean
  isPWA: boolean
  supportsStoragePersist: boolean
}

/**
 * Detect if the device is running iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/**
 * Get iOS version (returns null if not iOS)
 */
export function getIOSVersion(): number | null {
  if (!isIOS()) return null

  const match = navigator.userAgent.match(/OS (\d+)_/)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }

  return null
}

/**
 * Check if iOS version is 17 or higher
 */
export function isIOSVersion17OrHigher(): boolean {
  const version = getIOSVersion()
  return version !== null && version >= 17
}

/**
 * Detect if the app is running as an installed PWA
 * Works for iOS (standalone) and Android (various display modes)
 */
export function isPWA(): boolean {
  // iOS detection: check standalone mode
  if ('standalone' in window.navigator) {
    return (window.navigator as any).standalone === true
  }

  // Android/Desktop: check display-mode
  if (window.matchMedia) {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    )
  }

  return false
}

/**
 * Check if browser supports navigator.storage.persist()
 */
export function supportsStoragePersist(): boolean {
  return !!(navigator.storage && navigator.storage.persist)
}

/**
 * Get comprehensive platform information
 */
export function getPlatformInfo(): PlatformInfo {
  return {
    isIOS: isIOS(),
    isIOSVersion17OrHigher: isIOSVersion17OrHigher(),
    isPWA: isPWA(),
    supportsStoragePersist: supportsStoragePersist(),
  }
}

/**
 * Calculate eviction warning for iOS
 * Returns null if not applicable
 */
export function getIOSEvictionWarning(isPersisted: boolean, platformInfo: PlatformInfo): string | null {
  if (!platformInfo.isIOS) {
    return null // Not iOS
  }

  if (isPersisted) {
    return null // Data is persistent, no eviction
  }

  if (platformInfo.isPWA) {
    return null // Installed PWA, exempt from eviction
  }

  if (platformInfo.isIOSVersion17OrHigher) {
    return 'Data may be deleted after 7 days of Safari inactivity without user interaction with this site.'
  }

  // iOS < 17
  return 'Data may be deleted after 7 days of Safari inactivity. Consider adding this app to your home screen for better persistence.'
}
