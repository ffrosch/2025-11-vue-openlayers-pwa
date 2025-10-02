# Changelog

Chronological feature log for AI agent context. See [CLAUDE.md](CLAUDE.md) for technical architecture.

---

## Implemented Features

### 2025-10-01 - Phase 4: Mobile Optimization ✅

**Persistent Storage:**
- Request persistence on first download to prevent iOS 7-day eviction
- Check for existing areas before requesting to handle cancellation during async request

**Retry Logic:**
- `downloadTileWithRetry()` with exponential backoff (1s → 2s → 4s)
- Configurable `maxRetries` (default: 3) and `baseDelay` (default: 1000ms)
- Smart retry: skip 4xx errors (except 429 rate limit), retry 5xx/429/network failures
- Auto-applied in `downloadTiles()` batch downloads

**Quota Management:**
- Pre-download storage quota validation
- Throw descriptive error showing required vs available MB
- User-friendly alert in MapView.vue on quota exceeded
- Calculate required space using `estimateDownloadSize()`

**Modified Files:** `useOfflineTiles.ts`, `tileDownloader.ts`, `MapView.vue`
**Tests Added:** 8 (retry behavior, backoff, quota exceeded)
**Total Tests:** 96 passing

---

### 2025-10-01 - Phase 3: Area Management ✅

**Composables:**
- `useDownloadedAreas.ts` - Area metadata CRUD operations
  - `saveAreaMetadata()` - Persist area to IndexedDB (auto-called after download)
  - `getAllAreas()` - Retrieve all areas sorted by date (newest first)
  - `getAreaById()` - Fetch single area by ID
  - `deleteArea()` - Remove area metadata + all associated tiles
  - `getTotalStorageUsed()` - Calculate total bytes across all areas

**UI Components:**
- `OfflineAreasManager.vue` - Area management interface
  - List cards: name, date, zoom range (e.g., "8-10 (3 levels)"), tile count, size
  - "View on Map" button - emits bbox to center map
  - "Delete" button with confirmation dialog showing details + data loss warning
  - Empty state with helpful message
  - Summary footer: total areas, total size, storage %
- `OfflineAreasView.vue` - Full-page view at `/offline-areas` route

**Integration:**
- MapView.vue: Green FAB button for Areas Manager (grid icon)
- Router: Added `/offline-areas` route
- useOfflineTiles.ts: Auto-save metadata after successful downloads

**Modified Files:** `useDownloadedAreas.ts`, `OfflineAreasManager.vue`, `OfflineAreasView.vue`, `MapView.vue`, `router/index.ts`, `useOfflineTiles.ts`
**Tests Added:** 14 (area CRUD operations)
**Total Tests:** 88 passing

---

### 2025-10-01 - Phase 2: Download Functionality ✅

**Composables:**
- `useOfflineTiles.ts` - Download orchestration
  - `downloadArea()` - Batch tile download with progress tracking
  - `cancelDownload()` - Cancel in-progress downloads
  - `calculateDownloadEstimate()` - Preview tile count and size
  - `getCurrentMapExtent()` - Get current map bounding box
  - ETA calculation based on download speed
  - Graceful failure handling (track failed tiles)

**UI Components:**
- `DownloadButton.vue` - FAB + download dialog
  - Auto-calculated extent from map viewport
  - Area name input (auto-filled with date)
  - Additional zoom levels slider (0-5)
  - Real-time tile count and size estimates
  - Platform detection: iOS warnings for >3 zoom levels
  - Tile count limits: 2000 (iOS), 10000 (Android/Desktop)
  - Formatted size display in MB
- `DownloadProgress.vue` - Full-screen progress overlay
  - Circular progress ring with percentage
  - Download statistics: tiles downloaded/total, speed, ETA
  - Failed tile tracking
  - Bytes downloaded display
  - Cancel button (changes to Close when complete)

**Integration:**
- MapComponent.vue: Emit `mapReady` and `moveEnd` events
- MapView.vue: Complete download workflow
  - Download button as FAB (top-right)
  - Progress overlay during downloads
  - Cancellation and completion handling
  - Dynamic extent tracking (updates on pan/zoom)
  - Real-time zoom level from map view

**Modified Files:** `useOfflineTiles.ts`, `DownloadButton.vue`, `DownloadProgress.vue`, `MapComponent.vue`, `MapView.vue`
**Tests Added:** 14 (download orchestration, ETA, cancellation)
**Total Tests:** 74 passing

---

### 2025-10-01 - Phase 1: Core Infrastructure ✅

**Type Definitions (`types.ts`):**
- `TileCoord` - Tile coordinates (z, x, y)
- `BoundingBox` - Geographic extent (west, south, east, north)
- `DownloadedArea` - Area metadata (id, name, bbox, zoom levels, size, date)
- `DownloadProgress` - Download state (total, downloaded, failed, percentage, ETA)
- `StorageQuota` - Storage info (usage, quota, available, percentUsed, isPersisted)

**Services:**
- `tileCalculator.ts` - Web Mercator coordinate math
  - `lonLatToTile()` - Lat/lon → tile coords (handles wrapping, clamping)
  - `getTilesInExtent()` - All tiles in bounding box (validates bbox, handles date line)
  - `calculateDownloadList()` - Multi-zoom tile list (no duplicates)
  - `estimateDownloadSize()` - Byte estimation (20KB avg per tile)
- `tileDownloader.ts` - IndexedDB + fetch operations
  - `getTileFromStorage()` / `saveTileToStorage()` / `deleteTileFromStorage()` - IndexedDB CRUD
  - `getAllStoredTileKeys()` - Cache management
  - `downloadTile()` - Single tile download with URL template support
  - `downloadTiles()` - Batch download with progress tracking, graceful failure handling

**Composables:**
- `useStorageQuota.ts` - Storage API integration
  - `updateStorageInfo()` - Query and calculate storage quota
  - `requestPersistence()` - Request persistent storage
  - `formatBytes()` - Human-readable byte formatting
  - `isStorageSupported` - Browser Storage API detection

**Map Enhancement:**
- MapComponent.vue: Custom tile load function
  - Check IndexedDB cache first (offline support)
  - Fallback to network when online
  - Auto-cache fetched tiles for future offline use
  - Show placeholder when offline and tile unavailable

**Modified Files:** `types.ts`, `tileCalculator.ts`, `tileDownloader.ts`, `useStorageQuota.ts`, `MapComponent.vue`
**Tests Added:** 52 (22 tileCalculator + 17 tileDownloader + 13 useStorageQuota)
**Total Tests:** 60 passing

---

### 2025-10-01 - Phase 0: Testing Infrastructure ✅

**Framework Setup:**
- Vitest 3.2.4 with jsdom environment (browser API simulation)
- fake-indexeddb 6.2.2 for real IndexedDB testing (no mocks)
- @vue/test-utils 2.4.6 for Vue component testing
- Coverage reporting with v8
- TDD approach: write failing tests → implement → green

**Test Helpers:**
- `tests/helpers/mockTiles.ts` - Mock data generators (tiles, blobs, bboxes, areas)
- `tests/helpers/indexedDBHelpers.ts` - DB utilities (cleanup, counting, waiting)
- `tests/setup.ts` - Global setup (IndexedDB cleanup, navigator.storage mocks)

**Modified Files:** `vitest.config.ts`, `tests/setup.ts`, `tests/helpers/*`
**Tests Added:** 8 (IndexedDB, storage API, crypto.randomUUID)
**Total Tests:** 8 passing

---

### 2025-10-01 - Vue Router Integration

**Added:**
- vue-router 4.5.1
- Router config (`router/index.ts`): createWebHistory, BASE_URL for GitHub Pages
- Routes: `/` (HomeView), `/map` (MapView)
- HomeView.vue: Landing page with RouterLink to /map
- App.vue: Simplified to `<RouterView/>` outlet

**Modified Files:** `router/index.ts`, `HomeView.vue`, `App.vue`, `main.ts`

---

### 2025-10-01 - OpenLayers Map Integration

**Added:**
- ol 10.6.1 (OpenLayers library)
- types.ts: `MapConfig`, `MapViewOptions` interfaces
- MapComponent.vue: Reusable map component
  - OpenStreetMap tile layer
  - Lifecycle cleanup (mount/unmount)
  - Full width/height container
  - Accepts MapConfig prop
- MapView.vue: Full-screen map view
  - Fixed positioning (100vw × 100vh)
  - Pre-configured for Baden-Württemberg: [9.3501°E, 48.6616°N], zoom 8

**Modified Files:** `types.ts`, `MapComponent.vue`, `MapView.vue`

---

### Initial Setup

**Tech Stack:**
- Vue 3 + TypeScript + Vite + Bun
- Tailwind CSS 4 via `@tailwindcss/vite`
- vite-plugin-pwa: auto-update service worker, hourly sync, offline asset caching
- GitHub Pages deployment: `/2025-11-vue-openlayers-pwa/`
- Path alias: `@/` → `/src`

**Project Structure:**
- `src/components/` - Reusable Vue components
- `src/views/` - Page-level components
- `src/services/` - Business logic
- `src/composables/` - Vue composables
- `src/router/` - Vue Router config
- `src/types.ts` - Central TypeScript definitions
- `tests/` - Unit and integration tests

---

## Planned Features

### Pause/Resume Downloads
- IndexedDB download queue for interrupted downloads
- Save progress for resume capability
- Clear queue on successful completion or user cancellation

### Advanced Error Handling
- Persistent tile failures: mark failed tiles, allow manual retry
- iOS 7-day eviction detection: check sample tiles on startup, mark areas for re-download
- Duplicate area detection: check bbox overlap (>30%), prompt user before downloading

### Performance Optimizations
- AbortController for cancellable fetch operations
- In-memory LRU cache for IndexedDB lookups
- Preload adjacent tiles (spatial locality optimization)
- Web Workers for tile calculations (offload from main thread)
- Debounce extent changes for download preview
- Revoke object URLs after image load (memory management)

### Testing & Validation
- iOS Safari testing: quota limits, 7-day eviction policy
- Chrome Android testing: behavior comparison
- Offline mode validation: airplane mode testing
- Area deletion verification: space recovery confirmation
