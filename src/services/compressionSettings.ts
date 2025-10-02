import { get, set } from 'idb-keyval'
import type { CompressionSettings, CompressionProfile } from '@/types'

const SETTINGS_KEY = 'compression_settings'

/**
 * Default compression settings
 */
const DEFAULT_SETTINGS: CompressionSettings = {
  defaultProfile: 'balanced',
  cacheProfile: 'high', // Always use high quality for cached tiles
}

/**
 * Get current compression settings from IndexedDB
 */
export async function getCompressionSettings(): Promise<CompressionSettings> {
  const settings = await get<CompressionSettings>(SETTINGS_KEY)
  return settings || DEFAULT_SETTINGS
}

/**
 * Update compression settings in IndexedDB
 */
export async function setCompressionSettings(
  settings: CompressionSettings
): Promise<void> {
  await set(SETTINGS_KEY, settings)
}

/**
 * Update default download compression profile
 */
export async function setDefaultProfile(profile: CompressionProfile): Promise<void> {
  const settings = await getCompressionSettings()
  settings.defaultProfile = profile
  await setCompressionSettings(settings)
}

/**
 * Get default download compression profile
 */
export async function getDefaultProfile(): Promise<CompressionProfile> {
  const settings = await getCompressionSettings()
  return settings.defaultProfile
}

/**
 * Reset compression settings to defaults
 */
export async function resetCompressionSettings(): Promise<void> {
  await setCompressionSettings(DEFAULT_SETTINGS)
}
