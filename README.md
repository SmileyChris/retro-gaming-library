# Retro Gaming Library

A curated collection of 220 essential retro games across 9 classic platforms, built with Svelte 5 and Tailwind CSS.

## Platforms

- **SNES** - 39 games
- **GBA** - 38 games
- **Genesis** - 33 games
- **NES** - 20 games
- **N64** - 15 games
- **PS1** - 31 games
- **GB/GBC** - 16 games
- **Saturn** - 15 games
- **Master System** - 14 games

## Features

- Browse and filter games by platform, genre, or search
- Multiple sort options (A-Z, Z-A, Platform, Genre)
- Favorite games with local storage persistence
- "Favorites First" toggle to pin favorites to top
- "Hidden Gems" filter for lesser-known classics
- Box art and screenshots fetched from LibRetro Thumbnails
- Curated game descriptions with historical context

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Pushes to `main` automatically deploy to [retro.smileychris.name](https://retro.smileychris.name).

## Creating a ROM Set

Follow these steps to build a complete ROM set with media and translations:

### 1. Fetch ROMs

Download ROMs from Myrient (No-Intro and Redump sets):

```bash
node scripts/fetch-roms.js                    # Fetch all platforms
node scripts/fetch-roms.js --platform=SNES    # Single platform
node scripts/fetch-roms.js --game="Chrono"    # Single game (partial match)
```

**Options:**
- `--platform=X` - Filter to specific platform
- `--game=X` - Filter to games matching name
- `--refetch` / `-r` - Re-download existing ROMs
- `--fail-fast` / `-f` - Stop on first failure
- `--debug` / `-d` - Verbose output
- `--visible` - Show browser window (not headless)
- `--source=myrient|romspedia` - Force specific source

### 2. Scrape Media with Skraper

Use [Skraper](https://www.skraper.net/) to download images and videos for each platform:

1. Open Skraper and add each platform's ROM folder (`roms/{platform}/`)
2. Configure media output to `roms/{platform}/images/` and `roms/{platform}/videos/`
3. Scrape all platforms

### 3. Clean Up Multi-Disc Games

For PS1 and Saturn, create `.m3u` playlists for multi-disc games:

```bash
npm run cleanup-multidisc:dry    # Preview changes (recommended first)
npm run cleanup-multidisc        # Apply changes
```

This creates `.m3u` playlist files and updates `gamelist.xml` to use the playlist instead of individual disc entries. The disc ZIP files are kept intact.

### 4. Apply Fan Translation Patches

Patch Japan-only games with English translations:

```bash
npm run patch-jp              # Apply all patches
npm run patch-jp:revert       # Revert to original Japanese ROMs
```

**Games patched:**
- Mother 3 (GBA)
- Rhythm Tengoku (GBA)
- Magical Pop'n (SNES)

Patches are stored in the `patches/` directory.

### 5. Verify Media Files

Check for orphan media (images/videos without matching ROMs):

```bash
npm run check-orphan-media                     # Scan all platforms
node scripts/check-orphan-media.js --missing   # Also show ROMs missing media
node scripts/check-orphan-media.js --delete    # Remove orphan files
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run fetch-boxart` | Download box art from LibRetro |
| `npm run fetch-screenshots` | Download screenshots from LibRetro |
| `npm run patch-jp` | Apply fan translation patches |
| `npm run patch-jp:revert` | Revert translations to original |
| `npm run cleanup-multidisc` | Create M3U playlists, remove extra discs |
| `npm run cleanup-multidisc:dry` | Preview multi-disc cleanup |
| `npm run check-orphan-media` | Find orphan images/videos in roms |

## Box Art & Screenshots

Images are sourced from [libretro-thumbnails](https://github.com/libretro-thumbnails/libretro-thumbnails).

```bash
npm run fetch-boxart        # Download box art
npm run fetch-screenshots   # Download screenshots

# See all options
node scripts/fetch-assets.js --help
```

## Tech Stack

- [Svelte 5](https://svelte.dev/) with runes
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

## Project Structure

```
retro-gaming-app/
├── public/
│   ├── boxart/              # Downloaded box art images
│   └── screenshots/         # Downloaded game screenshots
├── patches/                 # Fan translation patch files
├── roms/                    # ROM files (gitignored)
│   ├── {platform}/          # Platform folders (snes, gba, etc.)
│   │   ├── *.zip            # ROM files
│   │   ├── images/          # Scraped images
│   │   └── videos/          # Scraped videos
├── scripts/
│   ├── fetch-roms.js        # Download ROMs from Myrient
│   ├── fetch-assets.js      # Download box art/screenshots
│   ├── patch-jp-games.js    # Apply fan translation patches
│   ├── cleanup-multidisc.js # Create M3U playlists
│   └── check-orphan-media.js # Find orphan media files
├── src/
│   ├── lib/
│   │   ├── data.js          # Game database & platform config
│   │   ├── descriptions.js  # Curated game descriptions
│   │   ├── GameCard.svelte
│   │   └── BoxArt.svelte
│   ├── App.svelte           # Main app component
│   └── app.css              # Global styles
└── package.json
```
