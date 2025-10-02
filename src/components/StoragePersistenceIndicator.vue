<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStorageQuota } from '@/composables/useStorageQuota'
import { getPlatformInfo, getIOSEvictionWarning } from '@/utils/platform'
import { formatBytes } from '@/utils/format'

const { storageInfo, updateStorageInfo, requestPersistence } = useStorageQuota()
const platformInfo = ref(getPlatformInfo())
const isExpanded = ref(false)
const isRequesting = ref(false)

const statusColor = computed(() => {
  if (storageInfo.value.isPersisted) return 'success'
  if (platformInfo.value.isPWA) return 'info'
  if (platformInfo.value.isIOS) return 'warning'
  return 'info'
})

const statusIcon = computed(() => {
  if (storageInfo.value.isPersisted) return '✓'
  if (platformInfo.value.isPWA) return 'ⓘ'
  if (platformInfo.value.isIOS) return '⚠'
  return 'ⓘ'
})

const statusText = computed(() => {
  if (storageInfo.value.isPersisted) {
    return 'Persistent Storage Enabled'
  }
  if (platformInfo.value.isPWA) {
    return 'Running as Installed App'
  }
  if (platformInfo.value.isIOS) {
    return 'Temporary Storage (iOS)'
  }
  return 'Best-Effort Storage'
})

const evictionWarning = computed(() => {
  return getIOSEvictionWarning(storageInfo.value.isPersisted, platformInfo.value)
})

const showPersistButton = computed(() => {
  return !storageInfo.value.isPersisted && platformInfo.value.supportsStoragePersist
})

async function handleRequestPersistence() {
  isRequesting.value = true
  try {
    const granted = await requestPersistence()
    if (!granted) {
      alert('Persistent storage request was denied by the browser. This is typically granted automatically after sufficient user interaction with the site.')
    }
  } catch (error) {
    console.error('Failed to request persistent storage:', error)
    alert('Failed to request persistent storage. Please try again.')
  } finally {
    isRequesting.value = false
  }
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

onMounted(() => {
  updateStorageInfo()
})
</script>

<template>
  <div class="persistence-indicator" :class="`status-${statusColor}`">
    <div class="indicator-header" @click="toggleExpanded">
      <div class="status-badge">
        <span class="status-icon">{{ statusIcon }}</span>
        <span class="status-text">{{ statusText }}</span>
      </div>
      <button class="expand-button" :class="{ expanded: isExpanded }">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </button>
    </div>

    <div v-if="isExpanded" class="indicator-details">
      <!-- Persistence Status -->
      <div class="detail-section">
        <h3>Storage Status</h3>
        <div class="detail-item">
          <span class="detail-label">Mode:</span>
          <span class="detail-value">{{ storageInfo.isPersisted ? 'Persistent' : 'Best-Effort' }}</span>
        </div>
        <div v-if="platformInfo.isPWA" class="detail-item">
          <span class="detail-label">App Type:</span>
          <span class="detail-value">Installed PWA</span>
        </div>
        <div v-if="platformInfo.isIOS" class="detail-item">
          <span class="detail-label">Platform:</span>
          <span class="detail-value">
            iOS {{ platformInfo.isIOSVersion17OrHigher ? '17+' : '< 17' }}
          </span>
        </div>
      </div>

      <!-- Eviction Warning -->
      <div v-if="evictionWarning" class="detail-section warning-section">
        <div class="warning-box">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">{{ evictionWarning }}</div>
        </div>
      </div>

      <!-- Storage Quota -->
      <div class="detail-section">
        <h3>Storage Quota</h3>
        <div class="detail-item">
          <span class="detail-label">Used:</span>
          <span class="detail-value">{{ formatBytes(storageInfo.usage) }} ({{ storageInfo.percentUsed.toFixed(1) }}%)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Available:</span>
          <span class="detail-value">{{ formatBytes(storageInfo.available) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Total Quota:</span>
          <span class="detail-value">{{ formatBytes(storageInfo.quota) }}</span>
        </div>
      </div>

      <!-- Request Persistence Button -->
      <div v-if="showPersistButton" class="detail-section">
        <button
          class="persist-button"
          @click="handleRequestPersistence"
          :disabled="isRequesting"
        >
          {{ isRequesting ? 'Requesting...' : 'Request Persistent Storage' }}
        </button>
        <p class="persist-hint">
          Persistent storage protects your data from automatic deletion and is typically granted after regular site usage.
        </p>
      </div>

      <!-- Additional Info -->
      <div class="detail-section info-section">
        <h3>What does this mean?</h3>
        <div v-if="storageInfo.isPersisted" class="info-text">
          Your offline map data is stored persistently and won't be automatically deleted by the browser.
        </div>
        <div v-else-if="platformInfo.isPWA" class="info-text">
          As an installed app, your data is protected from Safari's 7-day eviction policy, even without persistent storage.
        </div>
        <div v-else-if="platformInfo.isIOS && !platformInfo.isIOSVersion17OrHigher" class="info-text">
          On iOS versions before 17, adding this app to your home screen provides better data persistence.
        </div>
        <div v-else-if="platformInfo.isIOS" class="info-text">
          Safari may delete stored data after 7 days of inactivity. Request persistent storage or add this app to your home screen.
        </div>
        <div v-else class="info-text">
          Your browser uses best-effort storage. Data may be cleared under storage pressure but is generally stable.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.persistence-indicator {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 1rem;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  user-select: none;
}

.indicator-header:hover {
  background: #f9fafb;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.status-text {
  font-weight: 500;
  color: #111827;
}

.expand-button {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  transition: transform 0.2s;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-button.expanded {
  transform: rotate(180deg);
}

.indicator-details {
  border-top: 1px solid #e5e7eb;
  padding: 1rem;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 1000px;
  }
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.detail-value {
  color: #111827;
  font-weight: 500;
  font-size: 0.875rem;
}

/* Status Colors */
.status-success .status-icon {
  color: #059669;
}

.status-info .status-icon {
  color: #3b82f6;
}

.status-warning .status-icon {
  color: #f59e0b;
}

/* Warning Section */
.warning-section {
  margin-top: 1rem;
}

.warning-box {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 6px;
}

.warning-icon {
  flex-shrink: 0;
  font-size: 1.25rem;
}

.warning-text {
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Persist Button */
.persist-button {
  width: 100%;
  padding: 0.75rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.persist-button:hover:not(:disabled) {
  background: #2563eb;
}

.persist-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.persist-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 0;
}

/* Info Section */
.info-section {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.info-text {
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
