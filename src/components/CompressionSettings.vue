<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { CompressionProfile } from '@/types'
import {
  getCompressionSettings,
  setDefaultProfile,
  resetCompressionSettings,
} from '@/services/compressionSettings'
import { COMPRESSION_PROFILES } from '@/services/tileCompression'

const selectedProfile = ref<CompressionProfile>('balanced')
const isLoading = ref(true)
const isSaving = ref(false)

const profiles: Array<{ value: CompressionProfile; label: string; description: string }> = [
  {
    value: 'high',
    label: 'High Quality',
    description: `Best quality, ~${Math.round((1 - COMPRESSION_PROFILES.high.targetCompressionRatio) * 100)}% compression`,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: `Good quality, ~${Math.round((1 - COMPRESSION_PROFILES.balanced.targetCompressionRatio) * 100)}% compression (recommended)`,
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: `Maximum compression, ~${Math.round((1 - COMPRESSION_PROFILES.aggressive.targetCompressionRatio) * 100)}% compression`,
  },
]

async function loadSettings() {
  isLoading.value = true
  try {
    const settings = await getCompressionSettings()
    selectedProfile.value = settings.defaultProfile
  } finally {
    isLoading.value = false
  }
}

async function saveSettings() {
  isSaving.value = true
  try {
    await setDefaultProfile(selectedProfile.value)
  } finally {
    isSaving.value = false
  }
}

async function resetSettings() {
  isSaving.value = true
  try {
    await resetCompressionSettings()
    await loadSettings()
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="compression-settings">
    <h3>Download Compression Settings</h3>

    <div v-if="isLoading" class="loading">Loading settings...</div>

    <div v-else class="settings-content">
      <p class="description">
        Choose the compression quality for downloaded offline areas.
        Higher compression saves more storage space but may slightly reduce image quality.
      </p>

      <div class="profiles">
        <label
          v-for="profile in profiles"
          :key="profile.value"
          class="profile-option"
          :class="{ selected: selectedProfile === profile.value }"
        >
          <input
            type="radio"
            :value="profile.value"
            v-model="selectedProfile"
            @change="saveSettings"
          />
          <div class="profile-info">
            <div class="profile-label">{{ profile.label }}</div>
            <div class="profile-description">{{ profile.description }}</div>
          </div>
        </label>
      </div>

      <div class="note">
        <strong>Note:</strong> Compression only applies to newly downloaded areas.
        Existing areas will not be affected.
      </div>

      <button
        class="reset-button"
        @click="resetSettings"
        :disabled="isSaving"
      >
        Reset to Default
      </button>
    </div>
  </div>
</template>

<style scoped>
.compression-settings {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #6b7280;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.description {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

.profiles {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-option:hover {
  border-color: #d1d5db;
  background-color: #f9fafb;
}

.profile-option.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.profile-option input[type="radio"] {
  margin-top: 2px;
  cursor: pointer;
}

.profile-info {
  flex: 1;
}

.profile-label {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.profile-description {
  font-size: 13px;
  color: #6b7280;
}

.note {
  padding: 12px;
  background-color: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 4px;
  font-size: 13px;
  color: #92400e;
}

.note strong {
  font-weight: 600;
}

.reset-button {
  align-self: flex-start;
  padding: 8px 16px;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reset-button:hover:not(:disabled) {
  background-color: #4b5563;
}

.reset-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .compression-settings {
    padding: 16px;
  }

  h3 {
    font-size: 16px;
  }
}
</style>
