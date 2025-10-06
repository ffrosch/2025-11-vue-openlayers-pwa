
# Openlayers PWA App with Vue

## Resources

### Development Tools
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices) - Guidelines for working with Claude Code

### Offline Maps & PWA Storage (Research for Offline Tiles Feature)

**Key Resources:**

- **[idb-keyval](https://github.com/jakearchibald/idb-keyval)** - Lightweight IndexedDB wrapper (295-573 bytes)
  - *Takeaway*: Use this instead of raw IndexedDB for simple key-value storage of tile blobs. Promise-based, supports Blobs natively.

- **[MDN: Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)** - Browser storage quotas and persistence
  - *Takeaway*: iOS Safari IndexedDB quota: 500MB-1GB (vs 50MB Cache API). Use `navigator.storage.estimate()` to monitor usage. Request persistence with `navigator.storage.persist()`.

- **[MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)** - Client-side storage for structured data
  - *Takeaway*: Store tile Blobs directly (not Base64). Use meaningful keys like `tile_${z}_${x}_${y}`. Don't index binary fields for performance.

- **[OpenLayers Tile Loading](https://openlayers.org/en/latest/apidoc/module-ol_source_XYZ.html)** - Custom tile load functions
  - *Takeaway*: Use `tileLoadFunction` to intercept tile loads. Check IndexedDB first, fallback to network. Store fetched tiles for offline use.

- **[Browser Storage Quotas (web.dev)](https://web.dev/articles/storage-for-the-web)** - Cross-browser storage limits
  - *Takeaway*: Chrome/Desktop: 60-80% of disk. Firefox: 10GB max. Safari: 1GB with prompts. iOS: Aggressive 7-day eviction policy if app unused.

- **[PWA Maps Example (GitHub)](https://github.com/reyemtm/pwa-maps)** - Real-world offline maps implementation
  - *Takeaway*: Reference for tile preloading strategies and offline-first architecture patterns.

**Storage Strategy Summary:**
- **IndexedDB over Cache API**: 10x larger quota on iOS (500MB vs 50MB)
- **Platform Limits**: iOS (conservative: 3 zoom levels), Android (generous: 5+ zoom levels)
- **Tile Format**: Store as Blobs (binary), average 20KB per OSM tile
- **Download Strategy**: Batch 6 concurrent (browser limit), retry 3x with exponential backoff
- **Offline Loading**: IndexedDB → network → placeholder (graceful degradation)

## Initial setup

Install dependencies (make sure you are already in your project folder!)

```shell
bun create @vite-pwa/pwa . --template vue-ts
# Typescript must be a peer dependency to enable
# import and usage of types in Vue defineProps function
bun remove typescript && bun add --peer typescript
bun add tailwindcss
bun add -d @tailwindcss/vite @vue/tsconfig
bun install
```

Modify `"scripts"` in `package.json` to look like this

```json
{
  "scripts": {
    "dev": "bunx --bun vite",
    "build": "vue-tsc -b && bunx --bun vite build",
    "preview": "bunx --bun vite preview"
  }
}
```

Adjust `vite.config.js` to this

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  base: '/<project-name>/',
  plugins: [
    vue(),
    tailwindcss()
  ],
});
```

Add the `@` alias to `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Add fonts and tailwind as well as your basic theme to `src/style.css`


```css
@import "tailwindcss";
```

<!-- 

```css
@import url("https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600&display=swap");
@import "tailwindcss";

@theme {
  --color-primary--50: hsl(260, 100%, 95%);
  --color-primary--300: hsl(264, 82%, 80%);
  --color-primary--500: hsl(263, 55%, 52%);

  --color-neutral-white: hsl(0, 0%, 100%);
  --color-neutral-grey-100: hsl(214, 17%, 92%);
  --color-neutral-grey-200: hsl(0, 0%, 81%);
  --color-neutral-grey-400: hsl(224, 10%, 45%);
  --color-neutral-grey-500: hsl(217, 19%, 35%);
  --color-neutral-darkblue: hsl(219, 29%, 14%);
  --color-neutral-black: hsl(0, 0%, 7%);

  --text-xs: 0.8125rem;
  --font-barlow: "Barlow Semi Condensed", sans-serif;
}

body {
  font-size: var(--text-xs);
  font-family: var(--font-barlow);
}

a {
  color: var(--color-blue-400);
  text-decoration: underline;
}

a:hover {
  color: var(--color-blue-500);
  font-weight: var(--font-weight-semibold);
}
``` -->

Create the Github Workflow

```shell
mkdir -p .github/workflows && touch ./.github/workflows/main.yml
```

Paste this into `.github/workflows/main.yml`

```yml
# Simple workflow for deploying static content to GitHub Pages
name: Deploy static content to Pages

on:
  # Runs on pushes targeting the default branch
  push:
    branches: ['main']

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets the GITHUB_TOKEN permissions to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow one concurrent deployment
concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  # Single deploy job since we're just deploying
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies
        run: bun install
      - name: Build
        run: bun run build
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          # Upload dist folder
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```