# Testing Infrastructure

## Overview

This project uses **Vitest** for testing with a TDD (Test-Driven Development) approach. All tests use real implementations (no mocks) with `fake-indexeddb` for IndexedDB testing.

## Setup Verification

✅ **All 8 setup tests passing:**
- IndexedDB available
- navigator.storage mock working
- navigator.onLine mock working
- Data storage/retrieval working
- Complex objects storage working
- IndexedDB cleanup between tests
- Storage quota mock returning correct values
- crypto.randomUUID available

## Running Tests

```bash
# Run tests in watch mode (recommended during development)
bun test

# Run tests once
bun test:run

# Run tests with UI
bun test:ui

# Run tests with coverage report
bun test:coverage
```

## Test Structure

```
tests/
├── unit/
│   ├── services/         # Tile calculator, downloader tests
│   ├── composables/      # useStorageQuota, useOfflineTiles, useDownloadedAreas
│   └── components/       # MapComponent, DownloadButton, OfflineAreasManager
├── integration/          # Full offline workflow tests
├── helpers/              # Test utilities
│   ├── mockTiles.ts     # Mock tile data generators
│   └── indexedDBHelpers.ts  # DB cleanup utilities
├── setup.ts             # Global test setup
└── README.md            # This file
```

## Test Helpers

### Mock Tile Data (`helpers/mockTiles.ts`)

```typescript
import { createMockTileBlob, createMockTile, createMockBoundingBox } from '../helpers/mockTiles'

// Create a 1x1 transparent PNG blob
const blob = createMockTileBlob()

// Create mock tile coordinates
const tile = createMockTile(8, 100, 50) // z=8, x=100, y=50

// Create mock bounding box (Stuttgart area)
const bbox = createMockBoundingBox()

// Create mock downloaded area
const area = createMockDownloadedArea({ name: 'Test Area' })

// Create array of tiles
const tiles = createMockTiles(100) // 100 tiles
```

### IndexedDB Helpers (`helpers/indexedDBHelpers.ts`)

```typescript
import { clearAllDatabases, waitForIDB, countItemsInStore } from '../helpers/indexedDBHelpers'

// Clear all databases manually (beforeEach does this automatically)
await clearAllDatabases()

// Wait for an IndexedDB request
const result = await waitForIDB(request)

// Count items in a store
const count = await countItemsInStore('myDB', 'myStore')
```

## TDD Workflow

1. **Write failing test** for a function (e.g., `lonLatToTile()`)
2. **Run test**: `bun test tileCalculator.test.ts` → ❌ Fails
3. **Implement function** in source file
4. **Run test again** → If fails, debug and iterate
5. **Test passes** ✅ → Commit code + tests together
6. **Move to next function**

## Coverage Targets

- **Services/Composables**: >80%
- **Components**: >60%
- **Integration**: Full offline workflow covered

## Environment

- **Test Framework**: Vitest 3.2.4
- **DOM Environment**: jsdom 27.0.0
- **IndexedDB**: fake-indexeddb 6.2.2 (real implementation, not mocked)
- **Vue Testing**: @vue/test-utils 2.4.6

## Configuration

- **Config file**: `vitest.config.ts`
- **Setup file**: `tests/setup.ts` (runs before each test)
- **Globals**: Enabled (describe, it, expect available without imports)

## Notes

- IndexedDB is automatically cleared before each test
- navigator.storage.estimate() returns: 50 MB used / 500 MB quota
- navigator.onLine defaults to `true` (can be overridden in tests)
- Blob storage in fake-indexeddb has limitations (use object data for unit tests, real blobs in integration tests)

## Next Steps

After Phase 0 (Testing Infrastructure) is complete:

1. **Phase 1**: Write all tests for tile calculator (17 tests) - they will fail
2. **Phase 1**: Implement `tileCalculator.ts` until all tests pass
3. **Phase 1**: Write all tests for tile downloader (14 tests) - they will fail
4. **Phase 1**: Implement `tileDownloader.ts` until all tests pass
5. Continue this pattern for remaining phases...

## Troubleshooting

**Tests not running?**
- Ensure dependencies installed: `bun install`
- Check vitest.config.ts exists
- Verify tests/setup.ts is loaded

**IndexedDB errors?**
- Verify fake-indexeddb is imported in setup.ts
- Check beforeEach cleanup is running

**Type errors?**
- Run `bun run typecheck` to see TypeScript errors
- Ensure @/ alias is configured in both vite.config.ts and vitest.config.ts
