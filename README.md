# Retro Gaming Library

A curated collection of 200 essential retro games across 8 classic platforms, built with Svelte 5 and Tailwind CSS.

## Platforms

- **SNES** - 37 games
- **GBA** - 37 games
- **Genesis** - 31 games
- **NES** - 20 games
- **N64** - 15 games
- **PS1** - 30 games
- **GB/GBC** - 15 games
- **Saturn** - 15 games

## Features

- Browse and filter games by platform, genre, or search
- Multiple sort options (A-Z, Z-A, Platform, Genre)
- Favorite games with local storage persistence
- "Favorites First" toggle to pin favorites to top
- "Hidden Gems" filter for lesser-known classics
- Box art fetched from LibRetro Thumbnails

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Box Art

Box art is sourced from [libretro-thumbnails](https://github.com/libretro-thumbnails/libretro-thumbnails).

```bash
# Fetch all box art
npm run fetch-boxart

# Debug mode (shows URLs, fails fast)
npm run fetch-boxart:debug
```

### fetch-boxart options

| Flag | Description |
|------|-------------|
| `--debug`, `-d` | Show libretroName, matched name, and URL for each download |
| `--fail-fast`, `-f` | Exit on first download failure |
| `--refetch`, `-r` | Re-download existing images |

## Tech Stack

- [Svelte 5](https://svelte.dev/) with runes
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

## Project Structure

```
retro-gaming-app/
├── public/
│   └── boxart/          # Downloaded box art images
├── scripts/
│   └── fetch-boxart.js  # Box art download script
├── src/
│   ├── lib/
│   │   ├── data.js      # Game database & platform config
│   │   ├── GameCard.svelte
│   │   └── BoxArt.svelte
│   ├── App.svelte       # Main app component
│   └── app.css          # Global styles
└── package.json
```
