# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run fetch-boxart # Download box art from LibRetro Thumbnails
npm run fetch-boxart:debug  # Debug mode with --debug --fail-fast flags
```

### fetch-boxart options
- `--debug`, `-d`: Show libretroName, matched name, and URL for each download
- `--fail-fast`, `-f`: Exit on first download failure
- `--refetch`, `-r`: Re-download existing images

## Architecture

This is a Svelte 5 application using runes (`$state`, `$derived`, `$effect`, `$props`) for reactivity.

### Routing
Hash-based router in `src/lib/router.svelte.js` using `$state` for reactivity. Routes:
- `/` or `/home` - HomePage
- `/platform/:name` - PlatformPage filtered by platform
- `/genre/:name` - PlatformPage filtered by genre
- `/gems` - PlatformPage showing hidden gems
- `/favourites` - PlatformPage showing favorites

The `navigate()` function uses View Transitions API when available.

### State Management
- **Router state**: `router.svelte.js` exports `getRoute()` and `navigate()`
- **Search state**: `searchStore.svelte.js` - shared search query across components
- **Favorites**: Stored in localStorage (`retroLibraryFavorites`), managed in PlatformPage with `$effect` for persistence

### Data Structure
`src/lib/data.js` exports:
- `platformConfig`: Platform metadata (colors, gradients, LibRetro system names, external site mappings)
- `allGames`: Array of 219 games with `{id, name, platform, genres[], notes, gem, libretroName}`

### Key Components
- **Router.svelte**: Switches between HomePage and PlatformPage based on route
- **HomePage.svelte**: Landing page with search and PlatformSelector
- **PlatformPage.svelte**: Main game browsing view with filtering, sorting, favorites, and random game selection
- **PlatformSelector.svelte**: Draggable horizontal scroll of platform cards with momentum
- **GameCard.svelte**: Individual game display with favorite toggle and genre/gem links
- **BoxArt.svelte**: Renders box art from `/public/boxart/{platform}/{filename}.png`

### Box Art Pipeline
The `scripts/fetch-boxart.js` script:
1. Uses GitHub Trees API to get file listings from libretro-thumbnails repos
2. Fuzzy matches game names to available boxart
3. Downloads and optionally compresses with pngquant
4. Handles LibRetro's redirect files (text files pointing to other images)

Box art path convention: `/boxart/{platform}/{game_name_snake_case}.png`

### Styling
- Tailwind CSS 4 with `@tailwindcss/vite` plugin
- Global styles in `src/app.css`
- Component-scoped `<style>` blocks where needed (e.g., PlatformSelector)
- View transitions for smooth page/state changes
