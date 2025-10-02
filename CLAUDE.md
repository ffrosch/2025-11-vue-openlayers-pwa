# CLAUDE.md - Technical Reference

AI agent guidance for this Vue 3 + OpenLayers PWA codebase.

## Quick Reference

**Commands:** `dev` | `build` | `preview` | `typecheck` | `test` | `test:run` | `test:ui` | `test:coverage`
**Stack:** Vue 3 + TypeScript + Vite + Bun + Tailwind CSS 4 + PWA
**Deploy:** GitHub Pages @ `/2025-11-vue-openlayers-pwa/`
**Alias:** `@/` → `/src`
**Tests:** 167 passing (8 setup + 52 core + 24 download + 20 areas + 1 optimization + 11 overlay + 51 compression)

## Architecture

### Core Technologies

- **Vue 3** - Composition API, `<script setup lang="ts">` syntax only
- **TypeScript** - Strict mode, central types in `src/types.ts`
- **Vite** - Build tool with `--bun` flag for performance
- **Bun** - Package manager and runtime
- **Tailwind CSS 4** - via `@tailwindcss/vite` plugin
- **vite-plugin-pwa** - Workbox service worker
- **OpenLayers 10.6.1** - Direct integration (no Vue wrapper)
- **Vue Router 4.5.1** - HTML5 history mode
- **Vitest 3.2.4** - Testing with jsdom + fake-indexeddb 6.2.2 + @vue/test-utils 2.4.6

### PWA Configuration

- **Auto-update service worker** - `registerType: "autoUpdate"`, 1hr sync interval
- **Registration** - `PWABadge.vue` via `useRegisterSW` from `virtual:pwa-register/vue`
- **Cache strategy** - Precache: `js|css|html|svg|png|ico` files
- **Assets** - Generated from `public/favicon.svg` via `@vite-pwa/assets-generator` (minimal2023Preset)
- **Config** - `vite.config.ts` VitePWA plugin options + `pwa-assets.config.ts`
- **Update UI** - PWABadge component with reload/close actions

### Routing

```typescript
/                → HomeView.vue (landing page)
/map             → MapView.vue (full-screen OpenLayers map)
/offline-areas   → OfflineAreasView.vue (area management UI)
```

- Uses `createWebHistory` for clean URLs
- Respects `BASE_URL` for GitHub Pages compatibility
- Navigation via `<RouterLink>`, not `<a>` tags

### Offline Tiles Architecture

**Storage Model:** IndexedDB with four object stores:
- `tiles` - key: `tile_${z}_${x}_${y}`, value: Blob (compressed WebP/JPEG, originally ~20KB PNG from OSM)
- `metadata` - key: `area_${uuid}`, value: DownloadedArea object
- `tile_meta_*` - key: `tile_meta_${z}_${x}_${y}`, value: TileMetadata (compression stats)
- `compression_settings` - key: `compression_settings`, value: CompressionSettings

**Component Stack:**

1. **Services Layer**
   - `tileCalculator.ts` - Web Mercator (EPSG:3857) coordinate math
   - `tileDownloader.ts` - Fetch + IndexedDB CRUD + retry logic + compression integration
   - `tileCompression.ts` - WebP/JPEG compression using Canvas API (auto-detect format)
   - `compressionSettings.ts` - User compression preferences (high/balanced/aggressive)
   - `tileMetadata.ts` - Per-tile compression statistics tracking

2. **Composables Layer**
   - `useOfflineTiles.ts` - Download orchestration, progress tracking, cancellation
   - `useDownloadedAreas.ts` - Area metadata CRUD, bulk deletion
   - `useStorageQuota.ts` - Storage API queries, persistence requests
   - `useAreasOverlay.ts` - Vector layer management, area visualization, toggle visibility

3. **UI Layer**
   - `MapComponent.vue` - Custom tile loader (IndexedDB → network → placeholder)
   - `DownloadButton.vue` - FAB + dialog (extent, zoom slider, estimates, validation)
   - `DownloadProgress.vue` - Overlay (circular progress, stats, ETA, cancel)
   - `OfflineAreasManager.vue` - List view (cards, view/delete, confirmation)
   - `CompressionSettings.vue` - Compression quality settings (high/balanced/aggressive)

**Tile Loading Flow:**

```
1. Parse Z/X/Y from tile URL
2. Check IndexedDB for cached blob (key: tile_${z}_${x}_${y})
3. If found → createObjectURL → load image → revoke URL
4. If not found + online → fetch → store → load
5. If not found + offline → show placeholder
```

**Download Strategy:**

- **Concurrency** - 6 tiles/batch (browser connection limit)
- **Retry** - 3× with exponential backoff (1s → 2s → 4s)
  - Skip retry on 4xx errors (except 429 rate limit)
  - Retry on 5xx errors, 429, network failures
- **Progress** - `(downloaded + failed) / total × 100`
- **ETA** - `remaining / (downloaded / elapsedSeconds) × 1000`
- **Quota check** - Validate storage before download, request persistence on first download
- **Compression** - Auto-compress tiles during download (enabled by default)
  - Format: WebP (auto-detect support, fallback to JPEG)
  - Profile: User-selectable (high/balanced/aggressive)
  - Storage savings: 50-80% depending on profile
  - Metadata: Track format, profile, sizes, ratios per tile

**Storage Quotas by Platform:**

| Platform | Storage Quota | Eviction Policy | Persistent Storage Support |
|----------|---------------|-----------------|---------------------------|
| iOS Safari 17+ | Up to 60% of disk (browser), 80% (browser app) | 7-day eviction (without persistence or PWA install) | ✅ Yes (`navigator.storage.persist()`) |
| iOS Safari <17 | 500MB-1GB IndexedDB | 7-day eviction (exempt if installed as PWA) | ❌ No |
| Chrome/Android | Up to 60% of disk | No eviction with persistence | ✅ Yes (auto-granted after user interaction) |
| Firefox | Up to 50% of disk (persistent), 10% (best-effort) | Eviction only under storage pressure | ✅ Yes |
| Desktop Chrome/Edge | Up to 60% of disk | No eviction with persistence | ✅ Yes |

**iOS Eviction Details:**
- **iOS 17+ with persistence**: No 7-day eviction, data protected
- **iOS 17+ without persistence**: 7-day eviction after last user interaction with site
- **Installed PWA** (any iOS version): Exempt from 7-day eviction
- **iOS <17**: No `navigator.storage.persist()` support, must install as PWA for persistence

**Implementation:**
- Use `navigator.storage.estimate()` for real-time quota checks (not arbitrary tile limits)
- Request persistence on first download via `navigator.storage.persist()`
- Display eviction warnings based on iOS version + PWA status + persistence status
- Show actual available storage to users, not arbitrary limits

## File Structure

```
src/
├── composables/
│   ├── useOfflineTiles.ts        # downloadArea, cancelDownload, calculateDownloadEstimate, getCurrentMapExtent
│   ├── useStorageQuota.ts        # updateStorageInfo, requestPersistence, formatBytes, isStorageSupported
│   ├── useDownloadedAreas.ts     # saveAreaMetadata, getAllAreas, getAreaById, deleteArea, getTotalStorageUsed
│   └── useAreasOverlay.ts        # initializeLayer, toggleVisibility, updateAreasForZoom, refreshAreas, cleanup
├── services/
│   ├── tileCalculator.ts         # lonLatToTile, getTilesInExtent, calculateDownloadList, estimateDownloadSize
│   ├── tileDownloader.ts         # downloadTileWithRetry, downloadTiles, getTileFromStorage, saveTileToStorage, deleteTileFromStorage
│   ├── tileCompression.ts        # compressTile, compressTileAsJPEG, compressTileAsWebP, compressTileAuto, detectWebPSupport
│   ├── compressionSettings.ts    # getCompressionSettings, setDefaultProfile, getDefaultProfile, resetCompressionSettings
│   └── tileMetadata.ts           # saveTileMetadata, getTileMetadata, deleteTileMetadata, getCompressionStats
├── components/
│   ├── MapComponent.vue                # OpenLayers integration + offlineTileLoader, emits: mapReady, moveEnd
│   ├── DownloadButton.vue              # FAB + dialog (extent, zoom slider, real-time quota display)
│   ├── DownloadProgress.vue            # Overlay (circular %, tiles downloaded/total, speed, ETA, cancel/close)
│   ├── OfflineAreasManager.vue         # List cards (name, date, zoom, size, view/delete), confirmation dialog
│   ├── StoragePersistenceIndicator.vue # Persistence status, eviction warnings, quota info, request button
│   ├── CompressionSettings.vue         # Compression quality selector (high/balanced/aggressive)
│   ├── PWABadge.vue                    # Update notification UI (reload/close)
│   └── HelloWorld.vue                  # Demo component
├── views/
│   ├── HomeView.vue              # Landing page
│   ├── MapView.vue               # Map + download workflow + areas button
│   └── OfflineAreasView.vue      # Full-page area manager
├── router/index.ts               # Vue Router config (createWebHistory, BASE_URL)
├── utils/
│   ├── platform.ts               # iOS version detection, PWA detection, eviction warning logic
│   └── format.ts                 # formatBytes - human-readable byte formatting
├── types.ts                      # TileCoord, BoundingBox, DownloadedArea, DownloadProgress, StorageQuota, MapConfig
├── App.vue                       # Root component (<RouterView/>)
├── main.ts                       # Entry point (router integration)
├── style.css                     # Global Tailwind imports
└── vite-env.d.ts                 # Vite type declarations

tests/
├── helpers/
│   ├── mockTiles.ts              # Mock data generators (tiles, blobs, bboxes, areas)
│   └── indexedDBHelpers.ts       # DB utilities (cleanup, counting, waiting)
├── setup.ts                      # Global setup (IndexedDB cleanup, navigator.storage mocks, canvas polyfills)
└── unit/
    ├── services/                 # tileCalculator (22), tileDownloader (24), tileCompression (31), compressionSettings (8), tileMetadata (12)
    ├── composables/              # useStorageQuota (7), useOfflineTiles (14), useDownloadedAreas (14), useAreasOverlay (11)
    ├── utils/                    # format (9 tests)
    └── components/               # Component tests
```

## Core Algorithms

### Tile Calculation (`tileCalculator.ts`)

```typescript
lonLatToTile(lon: number, lat: number, zoom: number): { x: number, y: number }
  // Web Mercator: x = floor((lon+180)/360 * 2^zoom)
  // Handles longitude wrapping, latitude clamping

getTilesInExtent(bbox: BoundingBox, zoom: number): TileCoord[]
  // Get all tiles between topLeft ↔ bottomRight
  // Validates bbox, handles date line wrapping

calculateDownloadList(bbox: BoundingBox, baseZoom: number, additionalLevels: number): TileCoord[]
  // Collect tiles for [baseZoom .. baseZoom+additionalLevels]
  // Returns deduplicated list

estimateDownloadSize(tiles: TileCoord[]): number
  // tiles.length × 20_000 (20KB average OSM PNG tile)
```

### Tile Download (`tileDownloader.ts`)

```typescript
downloadTileWithRetry(tile: TileCoord, urlTemplate: string, maxRetries=3, baseDelay=1000): Promise<{ size: number }>
  // Exponential backoff: baseDelay × 2^(attempt-1)
  // Smart retry: skip 4xx (except 429), retry 5xx/429/network
  // Throws after max retries

downloadTiles(tiles: TileCoord[], urlTemplate: string, onProgress: Function, compress=true, profile?: CompressionProfile): Promise<void>
  // Batch download (6 concurrent), Promise.allSettled for graceful failure
  // Track failed tiles, update progress after each batch
  // Check onCancel flag between batches
  // Auto-compress tiles during download using user-selected profile

getTileFromStorage(tile: TileCoord): Promise<Blob | null>
saveTileToStorage(tile: TileCoord, blob: Blob, compress=false, profile?: CompressionProfile): Promise<void>
deleteTileFromStorage(tile: TileCoord): Promise<void>
getAllStoredTileKeys(): Promise<string[]>
  // IndexedDB CRUD operations for tiles
```

### Tile Compression (`tileCompression.ts`)

```typescript
detectWebPSupport(): Promise<boolean>
  // Test canvas.toBlob() capability for WebP format

detectBestCompressionFormat(): Promise<CompressionFormat>
  // Returns 'webp' if supported, otherwise 'jpeg'

compressTile(blob: Blob, format: CompressionFormat, profile: CompressionProfile): Promise<CompressedTile>
  // Blob → Image → Canvas → Compressed Blob (WebP/JPEG)
  // Returns: { blob, format, profile, originalSize, compressedSize, compressionRatio }

compressTileAsJPEG(blob: Blob, profile: CompressionProfile): Promise<CompressedTile>
compressTileAsWebP(blob: Blob, profile: CompressionProfile): Promise<CompressedTile>
  // Format-specific compression helpers

compressTileAuto(blob: Blob, profile: CompressionProfile): Promise<CompressedTile>
  // Auto-detect best format and compress

COMPRESSION_PROFILES: Record<CompressionProfile, CompressionProfileConfig>
  // high:       { quality: 0.92, targetCompressionRatio: 0.5 }
  // balanced:   { quality: 0.85, targetCompressionRatio: 0.7 }
  // aggressive: { quality: 0.75, targetCompressionRatio: 0.8 }
```

### Compression Settings (`compressionSettings.ts`)

```typescript
getCompressionSettings(): Promise<CompressionSettings>
  // Returns: { defaultProfile: 'balanced', cacheProfile: 'high' }

setDefaultProfile(profile: CompressionProfile): Promise<void>
  // Update user's preferred compression quality

resetCompressionSettings(): Promise<void>
  // Reset to defaults (balanced quality)
```

### Tile Metadata (`tileMetadata.ts`)

```typescript
saveTileMetadata(tile: TileCoord, format, profile, originalSize, compressedSize, compressionRatio): Promise<void>
  // Store compression stats for a tile

getTileMetadata(tile: TileCoord): Promise<TileMetadata | null>
  // Retrieve compression stats for a tile

getCompressionStats(tiles: TileCoord[]): Promise<{ totalOriginalSize, totalCompressedSize, averageCompressionRatio, tilesWithMetadata }>
  // Calculate aggregate compression statistics for multiple tiles
```

### Storage Quota (`useStorageQuota.ts`)

```typescript
updateStorageInfo(): Promise<StorageQuota>
  // navigator.storage.estimate() → { usage, quota, available, percentUsed, isPersisted }

requestPersistence(): Promise<boolean>
  // navigator.storage.persist() - prevent iOS 7-day eviction

isStorageSupported: ComputedRef<boolean>
  // Check navigator.storage API availability
```

### Format Utilities (`utils/format.ts`)

```typescript
formatBytes(bytes: number): string
  // Convert bytes to human-readable format (Bytes, KB, MB, GB, TB)
  // Example: 1048576 → "1 MB"
```

### Area Management (`useDownloadedAreas.ts`)

```typescript
saveAreaMetadata(area: DownloadedArea): Promise<void>
  // Store in IndexedDB metadata store (key: area_${uuid})

getAllAreas(): Promise<DownloadedArea[]>
  // Retrieve all areas, sorted by downloadDate desc

getAreaById(id: string): Promise<DownloadedArea | null>

deleteArea(areaId: string): Promise<void>
  // Delete all tiles (tile_${z}_${x}_${y}) + metadata
  // Updates storage quota

getTotalStorageUsed(): Promise<number>
  // Sum sizeBytes from all DownloadedArea objects
```

### Download Orchestration (`useOfflineTiles.ts`)

```typescript
downloadArea(area: DownloadedArea, onProgress: (progress: DownloadProgress) => void): Promise<void>
  // 1. Check storage quota (throw if insufficient)
  // 2. Request persistence (if first area)
  // 3. Calculate tile list
  // 4. Download with progress tracking
  // 5. Save area metadata on success

cancelDownload(): void
  // Set cancellation flag, stops between batches

calculateDownloadEstimate(bbox: BoundingBox, baseZoom: number, additionalLevels: number): { tiles: TileCoord[], estimatedSize: number }

getCurrentMapExtent(map: Map): BoundingBox
  // Get current viewport bounds in lon/lat
```

### Areas Overlay (`useAreasOverlay.ts`)

```typescript
initializeLayer(map: Map): Promise<void>
  // 1. Create vector layer with striped red polygon style (diagonal pattern)
  // 2. Load all downloaded areas from IndexedDB
  // 3. Add polygon features to layer (bbox corners → Web Mercator)
  // 4. Layer starts hidden (setVisible false)

toggleVisibility(): void
  // Toggle isVisible ref and layer visibility

updateAreasForZoom(zoom: number | null): Promise<void>
  // Filter and display only areas where zoom <= maxZoom (minZoom ignored)
  // Called automatically when map zoom changes
  // If zoom is null, shows all areas

refreshAreas(): Promise<void>
  // Reload areas from IndexedDB, clear and repopulate layer
  // Called after successful download or area deletion
  // Respects current zoom filter

cleanup(): void
  // Clear all features from vector layer source
```

## Code Style Guidelines

- **ES modules** - `import`/`export`, destructure when possible
- **TypeScript** - Strict mode, all types in `src/types.ts`
- **Vue** - Composition API only, `<script setup lang="ts">` syntax
- **Imports** - Always use `@/` alias (e.g., `import { Foo } from '@/types'`)
- **Commits** - Conventional Commits format:
  - Types: `feat|fix|docs|style|refactor|perf|test|chore`
  - Subject: <50 chars, imperative, lowercase, no period
  - Examples: `feat: add user authentication`, `fix: resolve map rendering issue`

## Development Workflow

1. **Type checking** - Always run `bun run typecheck` after code changes
2. **TypeScript dependency** - Must be peer dependency (not dev) for Vue `defineProps` type imports
3. **Bun flag** - Project uses `--bun` flag for faster Vite execution
4. **Testing** - TDD approach: write failing test → implement → green
5. **Documentation** - Update CLAUDE.md (architecture) + CHANGELOG.md (feature log) when making structural changes

## Key Dependencies

```
MapView.vue
  ├─→ MapComponent.vue (mapReady, moveEnd events)
  ├─→ DownloadButton.vue
  │     └─→ useOfflineTiles.calculateDownloadEstimate()
  ├─→ DownloadProgress.vue
  ├─→ useAreasOverlay.{initializeLayer, toggleVisibility, updateAreasForZoom, refreshAreas}()
  │     └─→ updateAreasForZoom() called on zoom change (handleMoveEnd)
  └─→ useOfflineTiles.downloadArea()
        ├─→ useStorageQuota.updateStorageInfo()
        ├─→ useStorageQuota.requestPersistence()
        ├─→ tileCalculator.calculateDownloadList()
        ├─→ tileDownloader.downloadTiles()
        └─→ useDownloadedAreas.saveAreaMetadata()

MapComponent.vue
  └─→ offlineTileLoader()
        ├─→ tileDownloader.getTileFromStorage()
        └─→ tileDownloader.saveTileToStorage()

OfflineAreasManager.vue
  └─→ useDownloadedAreas.{getAllAreas, deleteArea, getTotalStorageUsed}()
```

## Common Tasks

- **Add tile download feature** → Edit `useOfflineTiles.ts` + `tileDownloader.ts`
- **Modify area management** → Edit `useDownloadedAreas.ts` + `OfflineAreasManager.vue`
- **Change storage logic** → Edit `useStorageQuota.ts` + update IndexedDB schema
- **Update map behavior** → Edit `MapComponent.vue` (offlineTileLoader function)
- **Modify areas overlay** → Edit `useAreasOverlay.ts` + `MapView.vue`
- **Add new route** → Edit `router/index.ts` + create view in `views/`
- **Change tile calculations** → Edit `tileCalculator.ts` (Web Mercator math)
- **Run all tests** → `bun test:run`
- **Deploy to GitHub Pages** → Push to `main` (automatic via GitHub Actions)

## UI/UX Flow

1. User pans/zooms map to desired offline area
2. Clicks download button (cloud icon FAB, top-right)
3. Dialog shows: current extent, zoom level, tile count, size estimate, storage %
4. User enters area name, adjusts zoom slider (0-5 additional levels)
5. System validates: quota check, platform limits (iOS: 2000 tiles, Android: 10000)
6. User clicks "Download Area"
7. Progress overlay: circular %, tiles downloaded/total, speed (tiles/sec), ETA
8. On completion: area metadata saved, notification, map works offline
9. User can toggle areas overlay (package icon FAB) to show/hide downloaded areas as striped red polygons
   - **Zoom filtering**: Only shows areas where current zoom level is ≤ area's maxZoom (minZoom ignored)
   - Example: Area downloaded at zoom 8 with 2 additional levels (maxZoom=10) appears when map zoom is ≤ 10 (hides at zoom 11+)
10. User navigates to `/offline-areas` to manage downloaded areas
11. Delete: confirmation dialog → remove tiles + metadata → free storage → refresh overlay

## Technical Notes

- **IndexedDB best practices** - Store Blobs directly (no Base64), meaningful keys, revoke object URLs after use, don't index binary fields
- **Map projection** - Web Mercator (EPSG:3857), use `fromLonLat()` for [lon, lat] conversion
- **Vector layers** - Use `map.getLayers().push()` instead of `map.addLayer()` for TypeScript compatibility
- **Zoom-based filtering** - Areas overlay filters by `zoom <= maxZoom` (minZoom ignored), updates automatically on map zoom change
- **Canvas patterns** - Striped overlay uses HTML5 Canvas API for diagonal pattern; gracefully falls back to solid color if canvas unavailable
- **Test database** - fake-indexeddb provides real IndexedDB implementation (not mocks) for accurate testing
- **OpenLayers tests** - Mock `ResizeObserver` globally when testing components that create Map instances
- **Service worker** - Auto-updates hourly, configured in `PWABadge.vue`, manifest in `vite.config.ts`
- **GitHub Pages** - Base path `/2025-11-vue-openlayers-pwa/` configured in `vite.config.ts`
