import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCompressionSettings,
  setCompressionSettings,
  setDefaultProfile,
  getDefaultProfile,
  resetCompressionSettings,
} from '@/services/compressionSettings'

describe('compressionSettings', () => {
  beforeEach(async () => {
    // Reset to defaults before each test
    await resetCompressionSettings()
  })

  describe('getCompressionSettings', () => {
    it('should return default settings when no settings exist', async () => {
      const settings = await getCompressionSettings()

      expect(settings.defaultProfile).toBe('balanced')
      expect(settings.cacheProfile).toBe('high')
    })

    it('should return saved settings', async () => {
      await setCompressionSettings({
        defaultProfile: 'aggressive',
        cacheProfile: 'high',
      })

      const settings = await getCompressionSettings()
      expect(settings.defaultProfile).toBe('aggressive')
      expect(settings.cacheProfile).toBe('high')
    })
  })

  describe('setDefaultProfile', () => {
    it('should update default profile', async () => {
      await setDefaultProfile('high')

      const settings = await getCompressionSettings()
      expect(settings.defaultProfile).toBe('high')
    })

    it('should preserve cache profile when updating default profile', async () => {
      await setDefaultProfile('aggressive')

      const settings = await getCompressionSettings()
      expect(settings.defaultProfile).toBe('aggressive')
      expect(settings.cacheProfile).toBe('high')
    })
  })

  describe('getDefaultProfile', () => {
    it('should return balanced by default', async () => {
      const profile = await getDefaultProfile()
      expect(profile).toBe('balanced')
    })

    it('should return saved profile', async () => {
      await setDefaultProfile('high')

      const profile = await getDefaultProfile()
      expect(profile).toBe('high')
    })
  })

  describe('resetCompressionSettings', () => {
    it('should reset to default settings', async () => {
      await setDefaultProfile('aggressive')

      await resetCompressionSettings()

      const settings = await getCompressionSettings()
      expect(settings.defaultProfile).toBe('balanced')
      expect(settings.cacheProfile).toBe('high')
    })
  })

  describe('setCompressionSettings', () => {
    it('should save all settings', async () => {
      const newSettings = {
        defaultProfile: 'high' as const,
        cacheProfile: 'high' as const,
      }

      await setCompressionSettings(newSettings)

      const settings = await getCompressionSettings()
      expect(settings).toEqual(newSettings)
    })
  })
})
