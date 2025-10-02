# CLAUDE.md - Technical Reference

AI agent guidance for this Vue 3 + OpenLayers PWA codebase.

## Quick Reference

**Commands:** `dev` | `build` | `preview` | `typecheck` | `test` | `test:run` | `test:ui` | `test:coverage`
**Stack:** Vue 3 + TypeScript + Vite + Bun + Tailwind CSS 4 + PWA
**Deploy:** GitHub Pages @ `/2025-11-vue-openlayers-pwa/`
**Alias:** `@/` → `/src`
**Tests:** 96 passing (8 setup + 52 core + 14 download + 14 areas + 8 optimization)

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

**Storage Model:** IndexedDB with two object stores:
- `tiles` - key: `tile_${z}_${x}_${y}`, value: Blob (~20KB PNG from OSM)
- `metadata` - key: `area_${uuid}`, value: DownloadedArea object

**Component Stack:**

1. **Services Layer**
   - `tileCalculator.ts` - Web Mercator (EPSG:3857) coordinate math
   - `tileDownloader.ts` - Fetch + IndexedDB CRUD + retry logic

2. **Composables Layer**
   - `useOfflineTiles.ts` - Download orchestration, progress tracking, cancellation
   - `useDownloadedAreas.ts` - Area metadata CRUD, bulk deletion
   - `useStorageQuota.ts` - Storage API queries, persistence requests

3. **UI Layer**
   - `MapComponent.vue` - Custom tile loader (IndexedDB → network → placeholder)
   - `DownloadButton.vue` - FAB + dialog (extent, zoom slider, estimates, validation)
   - `DownloadProgress.vue` - Overlay (circular progress, stats, ETA, cancel)
   - `OfflineAreasManager.vue` - List view (cards, view/delete, confirmation)

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

**Platform Limits:**

| Platform | Tile Limit | Zoom Levels | Storage Quota | Notes |
|----------|-----------|-------------|---------------|-------|
| iOS Safari | 2000 | 3 recommended | 500MB-1GB IndexedDB | 7-day eviction without persistence |
| Android Chrome | 10000 | flexible | 33% free disk | No eviction policy |
| Desktop | 10000 | flexible | 6-8% disk space | Hundreds of GB possible |

**Storage Quotas:**
- iOS: Request persistence on first download to prevent 7-day eviction
- Check quota before download using `navigator.storage.estimate()`
- Show descriptive error when quota exceeded (required vs available MB)

## File Structure

```
src/
├── composables/
│   ├── useOfflineTiles.ts        # downloadArea, cancelDownload, calculateDownloadEstimate, getCurrentMapExtent
│   ├── useStorageQuota.ts        # updateStorageInfo, requestPersistence, formatBytes, isStorageSupported
│   └── useDownloadedAreas.ts     # saveAreaMetadata, getAllAreas, getAreaById, deleteArea, getTotalStorageUsed
├── services/
│   ├── tileCalculator.ts         # lonLatToTile, getTilesInExtent, calculateDownloadList, estimateDownloadSize
│   └── tileDownloader.ts         # downloadTileWithRetry, downloadTiles, getTileFromStorage, saveTileToStorage, deleteTileFromStorage
├── components/
│   ├── MapComponent.vue          # OpenLayers integration + offlineTileLoader, emits: mapReady, moveEnd
│   ├── DownloadButton.vue        # FAB + dialog (extent, zoom slider, tile/size estimates, platform warnings)
│   ├── DownloadProgress.vue      # Overlay (circular %, tiles downloaded/total, speed, ETA, cancel/close)
│   ├── OfflineAreasManager.vue   # List cards (name, date, zoom, size, view/delete), confirmation dialog, summary footer
│   ├── PWABadge.vue              # Update notification UI (reload/close)
│   └── HelloWorld.vue            # Demo component
├── views/
│   ├── HomeView.vue              # Landing page
│   ├── MapView.vue               # Map + download workflow + areas button
│   └── OfflineAreasView.vue      # Full-page area manager
├── router/index.ts               # Vue Router config (createWebHistory, BASE_URL)
├── types.ts                      # TileCoord, BoundingBox, DownloadedArea, DownloadProgress, StorageQuota, MapConfig
├── App.vue                       # Root component (<RouterView/>)
├── main.ts                       # Entry point (router integration)
├── style.css                     # Global Tailwind imports
└── vite-env.d.ts                 # Vite type declarations

tests/
├── helpers/
│   ├── mockTiles.ts              # Mock data generators (tiles, blobs, bboxes, areas)
│   └── indexedDBHelpers.ts       # DB utilities (cleanup, counting, waiting)
├── setup.ts                      # Global setup (IndexedDB cleanup, navigator.storage mocks)
└── unit/
    ├── services/                 # tileCalculator (22 tests), tileDownloader (24 tests)
    ├── composables/              # useStorageQuota (13), useOfflineTiles (14), useDownloadedAreas (14)
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

downloadTiles(tiles: TileCoord[], urlTemplate: string, onProgress: Function, onCancel?: Ref<boolean>): Promise<void>
  // Batch download (6 concurrent), Promise.allSettled for graceful failure
  // Track failed tiles, update progress after each batch
  // Check onCancel flag between batches

getTileFromStorage(tile: TileCoord): Promise<Blob | null>
saveTileToStorage(tile: TileCoord, blob: Blob): Promise<void>
deleteTileFromStorage(tile: TileCoord): Promise<void>
getAllStoredTileKeys(): Promise<string[]>
  // IndexedDB CRUD operations for tiles
```

### Storage Quota (`useStorageQuota.ts`)

```typescript
updateStorageInfo(): Promise<StorageQuota>
  // navigator.storage.estimate() → { usage, quota, available, percentUsed, isPersisted }

requestPersistence(): Promise<boolean>
  // navigator.storage.persist() - prevent iOS 7-day eviction

formatBytes(bytes: number): string
  // Human-readable: B, KB, MB, GB

isStorageSupported: ComputedRef<boolean>
  // Check navigator.storage API availability
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
9. User navigates to `/offline-areas` to manage downloaded areas
10. Delete: confirmation dialog → remove tiles + metadata → free storage

## Technical Notes

- **IndexedDB best practices** - Store Blobs directly (no Base64), meaningful keys, revoke object URLs after use, don't index binary fields
- **Map projection** - Web Mercator (EPSG:3857), use `fromLonLat()` for [lon, lat] conversion
- **Test database** - fake-indexeddb provides real IndexedDB implementation (not mocks) for accurate testing
- **Service worker** - Auto-updates hourly, configured in `PWABadge.vue`, manifest in `vite.config.ts`
- **GitHub Pages** - Base path `/2025-11-vue-openlayers-pwa/` configured in `vite.config.ts`
