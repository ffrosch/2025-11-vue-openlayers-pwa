# Changelog

This file tracks architectural decisions, feature additions, and significant changes to the project. It serves as context for AI agents and developers working on the codebase.

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
