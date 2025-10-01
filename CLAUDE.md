# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note:** See [CHANGELOG.md](CHANGELOG.md) for a detailed history of architectural changes, features, and component additions that provide additional context for understanding the codebase evolution.

## Project Overview

This is a Vue 3 + TypeScript PWA (Progressive Web App) using Vite as the build tool and Bun as the package manager. The project is configured for deployment to GitHub Pages and includes PWA capabilities with offline support and automatic updates.

## Common Commands

- `bun run dev` - Start development server with hot-reload
- `bun run build` - Build for production (runs type-checking first, then Vite build)
- `bun run preview` - Preview production build locally
- `bun run typecheck` - Run TypeScript type checking without building

## Architecture & Tech Stack

### Core Technologies
- **Vue 3** with Composition API and `<script setup>` syntax
- **TypeScript** - strictly typed throughout
- **Vite** - build tool and dev server
- **Bun** - package manager and runtime
- **Tailwind CSS 4** - utility-first styling via `@tailwindcss/vite` plugin
- **vite-plugin-pwa** - PWA capabilities with Workbox

### PWA Configuration
- Service worker with auto-update strategy (`registerType: "autoUpdate"`)
- Periodic sync check every hour for updates (configured in `PWABadge.vue`)
- Offline-ready with asset caching for `js`, `css`, `html`, `svg`, `png`, `ico` files
- PWA assets generated from `public/favicon.svg` via `@vite-pwa/assets-generator`
- Update notifications shown via `PWABadge` component with reload/close options

### Build & Deployment
- Base path configured as `/2025-11-vue-openlayers-pwa/` for GitHub Pages deployment
- GitHub Actions workflow deploys to Pages on push to `main` branch
- Path alias `@` points to `/src` directory

## Code Style Guidelines

- Use ES modules (`import`/`export`), not CommonJS
- Destructure imports when possible: `import { foo } from 'bar'`
- Always use TypeScript - keep central Interface and Type definitions file
- Use Vue Composition API exclusively, not Options API
- Use `<script setup lang="ts">` syntax for all Vue components
- **Always use `@/` alias for imports** (e.g., `import { Foo } from '@/types'`, `import Bar from '@/components/Bar.vue'`)

## Project Structure

```
src/
  ├── components/
  │   ├── HelloWorld.vue - Demo component
  │   └── PWABadge.vue - PWA update notification UI
  ├── assets/ - Static assets (images, etc.)
  ├── App.vue - Root component
  ├── main.ts - Application entry point
  ├── style.css - Global styles with Tailwind
  └── vite-env.d.ts - Vite type declarations
```

## Development Workflow

1. Always run `bun run typecheck` after making code changes
2. TypeScript must be a peer dependency (not dev dependency) to enable type imports in Vue `defineProps`
3. The project uses Bun's `--bun` flag for faster Vite execution

### Git Commit Guidelines

**Use Conventional Commits format** for all commit messages:

```
<type>: <description>

[optional body]

[optional footer]
```

**Common types:**
- `feat`: New feature for the user
- `fix`: Bug fix
- `docs`: Documentation changes only
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to build process, tooling, dependencies

**Examples:**
- `feat: add user authentication`
- `fix: resolve map rendering issue on mobile`
- `docs: update installation instructions`
- `refactor: simplify map component logic`

**Guidelines:**
- Keep subject line under 50 characters
- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter of subject
- No period at the end of subject
- Separate subject from body with blank line
- Use body to explain what and why, not how

## PWA Development Notes

- Service worker registration happens in `PWABadge.vue` via `useRegisterSW` from `virtual:pwa-register/vue`
- Update check interval is 1 hour (configurable via `period` constant in `PWABadge.vue`)
- PWA manifest configured in `vite.config.ts` under `VitePWA` plugin options
- Generate PWA assets using config in `pwa-assets.config.ts` (uses `minimal2023Preset`)