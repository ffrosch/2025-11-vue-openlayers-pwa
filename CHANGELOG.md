# Changelog

This file tracks architectural decisions, feature additions, and significant changes to the project. It serves as context for AI agents and developers working on the codebase.

---

## Planned Features

### Offline Map Tiles with Download Management

**Goal**: Enable users to download map tiles for offline use with full area management capabilities.

#### Phase 1: Core Infrastructure (Week 1)
- **Dependencies**: Add `idb-keyval@6.2.1` for IndexedDB storage
- **Storage Strategy**:
  - Use IndexedDB (not Cache API) for tile storage (500MB-1GB quota on mobile vs 50MB Cache API limit)
  - Store tiles as Blobs with keys: `tile_${z}_${x}_${y}`
  - Create separate stores: tiles (Blobs), areas metadata (DownloadedArea objects), download queue (for pause/resume)
- **Type Definitions** (add to `src/types.ts`):
  - `TileCoord` - Tile coordinates (z, x, y)
  - `BoundingBox` - Geographic extent (west, south, east, north)
  - `DownloadedArea` - Area metadata (id, name, bbox, zoom levels, size, date, tile count)
  - `DownloadProgress` - Download state tracking (total, downloaded, failed, percentage, ETA, bytes)
  - `StorageQuota` - Storage info (usage, quota, available, percentUsed, isPersisted)
- **Services**:
  - `src/services/tileCalculator.ts` - Convert lat/lon to tile coords, calculate tiles in bounding box
  - `src/services/tileDownloader.ts` - Download orchestration with retry logic and progress tracking
- **Composables**:
  - `src/composables/useStorageQuota.ts` - Monitor storage quota, request persistent storage
- **Map Enhancement**:
  - Update `MapComponent.vue` with custom `tileLoadFunction`
  - Load tiles from IndexedDB first, fallback to network
  - Store fetched tiles automatically when online
  - Use placeholder image when offline and tile not cached

#### Phase 2: Download Functionality (Week 2)
- **Download Button Component** (`src/components/DownloadButton.vue`):
  - Floating action button (FAB) on map (top-right corner)
  - Opens download dialog with current extent calculation
- **Download Dialog**:
  - Show current map extent (auto-calculated bounding box)
  - Display current zoom level
  - User input: Area name (auto-filled with date/location)
  - User input: Additional zoom levels slider (0-5, warn if >3 on iOS)
  - Real-time calculations:
    - Total tiles to download
    - Estimated size (avg 20KB per tile)
    - Estimated download time (based on network speed)
    - Storage impact (percentage of quota)
  - Platform-specific limits:
    - iOS: Max 3 additional zoom levels recommended, 2000 tiles hard limit
    - Android/Desktop: Max 5 zoom levels, 10000 tiles limit
- **Download Progress Component** (`src/components/DownloadProgress.vue`):
  - Full-screen overlay (non-dismissible during download)
  - Progress ring/bar with percentage
  - Statistics: "Downloading tile X of Y", speed, ETA, size downloaded
  - Pause/Cancel buttons
  - Background mode: Minimize to notification (if supported)
- **Download Logic** (`src/composables/useOfflineTiles.ts`):
  - Batch download (6 tiles concurrent - browser connection limit)
  - Use `Promise.allSettled` for graceful failure handling
  - Retry failed tiles (3 attempts with exponential backoff)
  - Progress updates after each batch
  - Save area metadata after successful download
  - Cleanup on cancellation

#### Phase 3: Area Management (Week 3)
- **Downloaded Areas Manager Component** (`src/components/OfflineAreasManager.vue`):
  - List view of downloaded areas with cards showing:
    - Area name and location icon
    - Download date
    - Zoom level range (e.g., "8-11 (4 levels)")
    - Size in MB and tile count
    - Actions: "View on Map" (center map to area), "Delete" (with confirmation)
  - Summary footer: Total areas, total size, storage percentage
- **Areas Management View** (`src/views/OfflineAreasView.vue`):
  - Full-page view accessible from navigation or modal
  - Route: `/offline-areas`
- **Area Composable** (`src/composables/useDownloadedAreas.ts`):
  - CRUD operations for downloaded areas
  - List all areas with metadata
  - Delete area: Remove all tiles + metadata
  - View area: Center map to bbox coordinates
  - Calculate total storage used
- **Metadata Storage**:
  - Custom IndexedDB store for `DownloadedArea` objects
  - Track download date for cleanup policies
  - Store tile URL template for future re-downloads

#### Phase 4: Mobile Optimization & Polish (Week 4)
- **Platform Detection & Limits**:
  - Detect iOS vs Android vs Desktop
  - Apply platform-specific constraints:
    - iOS: Conservative limits (3 zoom levels, 100MB recommended)
    - Android/Desktop: Generous limits (5 zoom levels, 500MB)
  - Show platform-specific warnings in download dialog
- **Persistent Storage**:
  - Request persistent storage on first download
  - Show notification if granted/denied
  - Track persistence status in UI
- **Pause/Resume Downloads**:
  - Implement download queue in IndexedDB
  - Save progress for resume after interruption
  - Clear queue on successful completion or cancellation
- **Quota Management**:
  - Handle quota exceeded errors gracefully
  - Stop download and save progress
  - Prompt user to delete old areas or reduce zoom levels
  - Implement LRU cleanup strategy for automatic tile eviction
- **Error Handling**:
  - Network failure: Retry with exponential backoff (3 attempts)
  - Persistent failures: Mark tiles as failed, allow retry later
  - iOS 7-day eviction: Detect missing tiles on startup, mark areas for re-download
  - Duplicate area: Check bbox overlap, prompt user before downloading
- **Performance Optimizations**:
  - Use `AbortController` for cancellable fetches
  - Implement in-memory LRU cache for IndexedDB lookups
  - Preload adjacent tiles (spatial locality)
  - Use Web Workers for tile calculations (offload from main thread)
  - Debounce extent changes for download preview
  - Revoke object URLs after image load (memory management)
- **Testing & Validation**:
  - Test on iOS Safari (quota limits, 7-day eviction)
  - Test on Chrome Android (behavior comparison)
  - Verify offline loading in airplane mode
  - Test quota exceeded scenarios
  - Validate area deletion and space recovery

#### Technical Architecture Notes
- **Storage Quotas**:
  - iOS Safari: 50MB Cache API, 500MB-1GB IndexedDB (1GB for home screen PWA)
  - Chrome Android: 33% of free disk space
  - Desktop: 6-8% of disk space (hundreds of GB possible)
  - iOS 7-day eviction policy: Storage cleared if app unused for 7 days
- **Tile Coordinate System**:
  - Web Mercator (EPSG:3857) for tile calculations
  - Standard Z/X/Y format: `tile_{zoom}_{x}_{y}`
  - Algorithm: `lonLatToTile(lon, lat, zoom)` for coordinate conversion
- **Download Strategy**:
  - Concurrent batches of 6 tiles (browser connection limit)
  - Average tile size: 20KB (PNG from OSM)
  - Progress calculation: `(downloaded + failed) / total * 100`
  - ETA calculation: `remaining / (downloaded / elapsedSeconds) * 1000`
- **Offline Tile Loading Flow**:
  1. Parse Z/X/Y from tile URL
  2. Check IndexedDB for cached blob
  3. If found: Create object URL, load, revoke URL
  4. If not found and online: Fetch, store, load
  5. If not found and offline: Show placeholder image
- **IndexedDB Best Practices**:
  - Store Blobs directly (no Base64 encoding)
  - Use meaningful, searchable keys
  - Clean up object URLs after use
  - Don't index binary fields (performance)
  - Implement quota exceeded error handling

#### UI/UX Flow
1. User views map area they want offline
2. Clicks download button (cloud icon, top-right)
3. Dialog shows: current extent, zoom, tile count, size estimate, storage %
4. User enters area name, selects additional zoom levels (slider)
5. System validates: check quota, platform limits, overlaps
6. User clicks "Download Area"
7. Progress overlay shows: percentage, tiles downloaded, speed, ETA
8. On completion: Area saved, notification shown, map continues to work offline
9. User can view `/offline-areas` to manage downloaded areas
10. Delete removes tiles + metadata, frees storage

#### Success Criteria
- ✅ Download tiles for visible map extent + configurable zoom levels
- ✅ Store tiles in IndexedDB (mobile-compatible, OpenLayers-compatible)
- ✅ Automatically use offline tiles when device is offline
- ✅ Show download progress with accurate ETA
- ✅ List downloaded areas with size and delete functionality
- ✅ Handle platform-specific storage limits (iOS vs Android)
- ✅ Graceful error handling (quota exceeded, network failures)
- ✅ Works reliably on iOS Safari and Chrome Android

#### File & Folder Structure
```
src/
├── composables/
│   ├── useOfflineTiles.ts        # Download orchestration, tile management
│   ├── useStorageQuota.ts        # Storage monitoring, quota checks
│   └── useDownloadedAreas.ts     # Area CRUD operations
├── services/
│   ├── tileCalculator.ts         # lonLatToTile, getTilesInExtent, estimateSize
│   └── tileDownloader.ts         # downloadAndStoreTile, batchDownload, retry logic
├── components/
│   ├── MapComponent.vue          # Enhanced with offlineTileLoader
│   ├── DownloadButton.vue        # FAB + download dialog
│   ├── DownloadProgress.vue      # Progress overlay with ETA
│   └── OfflineAreasManager.vue   # Areas list with delete
├── views/
│   └── OfflineAreasView.vue      # Full-page areas manager
└── types.ts                       # Add: TileCoord, BoundingBox, DownloadedArea,
                                   #      DownloadProgress, StorageQuota
```

#### Key Functions & Algorithms

**Tile Calculation** (`tileCalculator.ts`):
```typescript
lonLatToTile(lon: number, lat: number, zoom: number): { x: number, y: number }
  // Web Mercator formula: x = floor((lon + 180) / 360 * 2^zoom)

getTilesInExtent(bbox: BoundingBox, zoom: number): TileCoord[]
  // Get all tiles between topLeft and bottomRight tile coords

calculateDownloadList(bbox: BoundingBox, baseZoom: number, additionalLevels: number): TileCoord[]
  // Collect tiles for baseZoom through baseZoom+additionalLevels

estimateDownloadSize(tiles: TileCoord[]): number
  // tiles.length * 20KB (average OSM PNG tile size)
```

**Download Orchestration** (`tileDownloader.ts`):
```typescript
downloadAndStoreTile(tile: TileCoord, urlTemplate: string): Promise<{ size: number }>
  // Fetch tile from URL, store Blob in IndexedDB with key tile_${z}_${x}_${y}
  // Retry 3 times with exponential backoff on failure

batchDownloadTiles(tiles: TileCoord[], batchSize: number, onProgress: Function): Promise<void>
  // Download in batches of 6 (browser connection limit)
  // Use Promise.allSettled for graceful failure handling
  // Update progress after each batch
```

**Offline Tile Loading** (`MapComponent.vue`):
```typescript
offlineTileLoader(imageTile: any, src: string): Promise<void>
  // 1. Parse z/x/y from URL
  // 2. Check IndexedDB for cached blob (key: tile_${z}_${x}_${y})
  // 3. If found: createObjectURL, load, revoke URL
  // 4. If not found + online: fetch, store, load
  // 5. If not found + offline: show placeholder
```

**Storage Management** (`useStorageQuota.ts`):
```typescript
updateStorageInfo(): Promise<StorageQuota>
  // navigator.storage.estimate() → usage, quota, available, percentUsed

requestPersistence(): Promise<boolean>
  // navigator.storage.persist() → request persistent storage

formatBytes(bytes: number): string
  // Convert bytes to human-readable (KB, MB, GB)
```

**Area Management** (`useDownloadedAreas.ts`):
```typescript
saveAreaMetadata(area: DownloadedArea): Promise<void>
  // Store in custom IndexedDB store: areas_${areaId} → DownloadedArea

getAllAreas(): Promise<DownloadedArea[]>
  // Retrieve all area metadata for list view

deleteArea(areaId: string): Promise<void>
  // Delete all tiles (tile_${z}_${x}_${y}) + area metadata
  // Update storage quota

getTotalStorageUsed(): Promise<number>
  // Sum sizeBytes from all DownloadedArea objects
```

#### UI Mockups

**Download Dialog**:
```
┌─────────────────────────────────────────────────┐
│  Download Area for Offline Use                  │
├─────────────────────────────────────────────────┤
│  Area Name: [Baden-Württemberg Area        ]    │
│                                                  │
│  Current View:                                   │
│  • Zoom level: 8                                │
│  • Extent: 48.2°N - 49.1°N, 8.1°E - 10.5°E     │
│                                                  │
│  Additional Zoom Levels: [2]  ◄────────►        │
│  (Download zoom 8 to 10)                        │
│                                                  │
│  ⚠️ iOS devices: 3 levels max recommended       │
│                                                  │
│  Download Summary:                              │
│  • Total tiles: 1,234                           │
│  • Estimated size: ~25 MB                       │
│  • Storage remaining: 475 MB (95%)              │
│  • Estimated time: ~45 seconds                  │
│                                                  │
│            [Cancel]  [Download Area]            │
└─────────────────────────────────────────────────┘
```

**Progress Overlay**:
```
┌─────────────────────────────────────────────────┐
│              Downloading Area                    │
│                   ◯◯◯◯◯◯◯                       │
│                  ◯   45%  ◯                     │
│                   ◯◯◯◯◯◯◯                       │
│                                                  │
│          Downloading tile 556 of 1,234          │
│          Downloaded: 11.2 MB of 25 MB           │
│          Speed: 48 tiles/sec                    │
│          Time remaining: ~30 seconds            │
│                                                  │
│              [Pause]    [Cancel]                │
└─────────────────────────────────────────────────┘
```

**Areas Manager**:
```
┌─────────────────────────────────────────────────┐
│  Downloaded Offline Areas              [Close]  │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐ │
│  │ 📍 Baden-Württemberg Region              │ │
│  │ Downloaded: Jan 15, 2025 14:32           │ │
│  │ Zoom levels: 8-10 (3 levels)             │ │
│  │ Size: 25.4 MB (1,234 tiles)              │ │
│  │ [View on Map]                   [Delete] │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 📍 Stuttgart City Center                 │ │
│  │ Downloaded: Jan 14, 2025 09:15           │ │
│  │ Zoom levels: 12-15 (4 levels)            │ │
│  │ Size: 87.2 MB (4,512 tiles)              │ │
│  │ [View on Map]                   [Delete] │ │
│  └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  Total: 2 areas • 112.6 MB of 500 MB (22.5%)   │
└─────────────────────────────────────────────────┘
```

#### Error Handling & Edge Cases

**Quota Exceeded During Download**:
- Stop download gracefully, save progress to queue
- Show error: "Storage quota exceeded. Delete old areas or reduce zoom levels."
- Allow user to retry with fewer zoom levels or delete areas

**Network Failure Mid-Download**:
- Retry each tile 3 times with exponential backoff (1s, 2s, 4s delays)
- If persistent failure, mark tile as failed
- Continue with remaining tiles
- Show summary: "Downloaded 1,180 of 1,234 tiles (54 failed). Retry failed tiles?"

**User Cancels Download**:
- Stop fetch operations immediately (use AbortController)
- Delete all partially downloaded tiles for that area
- Remove area metadata
- Restore UI to pre-download state

**iOS 7-Day Storage Eviction**:
- On app startup, verify stored areas still exist (check sample tiles)
- If tiles missing, mark area status as "Needs Re-download"
- Show notification: "Offline areas were cleared by iOS. Re-download to use offline."
- Provide one-click re-download button

**Duplicate/Overlapping Area**:
- Before download, check if bbox overlaps with existing areas (>30% overlap)
- Prompt: "This area overlaps with 'Area XYZ' (45%). Download anyway?"
- Options: "Download Anyway", "Merge with Existing", "Cancel"

**Delete Area Confirmation**:
- Show dialog: "Delete 'Area Name' (25.4 MB, 1,234 tiles)? This cannot be undone."
- On confirm: Delete tiles, delete metadata, update storage display
- Show toast: "Area deleted. 25.4 MB freed."

**Tile Load Failures**:
- If IndexedDB read fails: Log error, try network fallback
- If network fails and no cache: Show error tile placeholder (gray with ⚠️ icon)
- If object URL creation fails: Use data URL fallback

**Platform-Specific Warnings**:
- iOS + >3 zoom levels: "Warning: iOS storage limits may prevent download. Recommended: 3 levels max."
- iOS + >2000 tiles: "Error: Tile count exceeds iOS limit (2000). Reduce area or zoom levels."
- Desktop + >10000 tiles: "Warning: Large download. This may take several minutes."

---

## 2025-10-01 - Vue Router Integration

### Added
- **Vue Router** (`vue-router@4.5.1`) - Official routing library for Vue.js
- **Router configuration** (`src/router/index.ts`):
  - Uses `createWebHistory` mode for clean URLs
  - Respects `BASE_URL` from environment for GitHub Pages compatibility
  - Defines two routes:
    - `/` - Home view (landing page)
    - `/map` - Map view (full-screen OpenLayers map)
- **HomeView** (`src/views/HomeView.vue`) - Landing page component:
  - Contains original App.vue content (logos, HelloWorld component)
  - Includes `RouterLink` to `/map` with styled button
  - Includes PWABadge component

### Modified
- **App.vue** - Simplified to router outlet:
  - Now only contains `<RouterView />` component
  - All content moved to HomeView
- **main.ts** - Added router integration:
  - Imports router from `@/router`
  - Registers router via `.use(router)`

### Architecture Notes
- **Routing pattern** - Uses Vue Router 4 with TypeScript support
- **Navigation** - All internal navigation uses `RouterLink` component (not `<a>` tags)
- **Route components** - View components are directly imported (not lazy-loaded)
- **History mode** - Uses HTML5 history mode for clean URLs without hash fragments

### Dependencies
- `vue-router` v4.5.1 - Vue Router library

---

## 2025-10-01 - OpenLayers Map Integration

### Added
- **OpenLayers package** (`ol@10.6.1`) - Core mapping library
- **Central types file** (`src/types.ts`) - TypeScript interfaces for map configuration:
  - `MapConfig` - Map initialization configuration (center, zoom)
  - `MapViewOptions` - Extended view options with projection support
- **MapComponent** (`src/components/MapComponent.vue`) - Reusable map component:
  - Uses Vue Composition API with `<script setup>`
  - Integrates OpenLayers Map with OpenStreetMap (OSM) tile layer
  - Accepts `MapConfig` prop for configuration
  - Properly handles map lifecycle (mount/unmount cleanup)
  - Imports OpenLayers CSS (`ol/ol.css`)
  - Full width/height container styling
- **MapView** (`src/views/MapView.vue`) - Full-screen map view:
  - Fixed positioning (100vw × 100vh)
  - Pre-configured for Baden-Württemberg region:
    - Center: [9.3501°E, 48.6616°N] (lon/lat format)
    - Zoom level: 8
- **Views directory** (`src/views/`) - Created for page-level components

### Architecture Notes
- **Direct OpenLayers integration** - Uses original `ol` package, not Vue wrappers
- **Coordinate system** - Uses `fromLonLat()` to convert [lon, lat] to map projection
- **Import pattern** - All internal imports use `@/` alias (e.g., `@/types`, `@/components/MapComponent.vue`)
- **Component structure** - Map logic separated into reusable component with view-specific configuration in parent

### Dependencies
- `ol` v10.6.1 - Main OpenLayers library (includes TypeScript definitions)

---

## Initial Setup

### Tech Stack
- **Vue 3** with Composition API
- **TypeScript** - Strictly typed
- **Vite** - Build tool
- **Bun** - Package manager
- **Tailwind CSS 4** - Styling via `@tailwindcss/vite`
- **vite-plugin-pwa** - PWA capabilities

### Project Structure
```
src/
  ├── components/     # Reusable Vue components
  ├── views/          # Page-level components
  ├── assets/         # Static assets
  ├── types.ts        # Central TypeScript definitions
  ├── App.vue         # Root component
  ├── main.ts         # Entry point
  └── style.css       # Global styles
```

### Configuration
- Path alias `@` → `/src` (configured in `vite.config.ts`)
- Base path: `/2025-11-vue-openlayers-pwa/` (GitHub Pages)
- PWA auto-update with hourly sync checks
