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

## Box Art & Screenshots

Images are sourced from [libretro-thumbnails](https://github.com/libretro-thumbnails/libretro-thumbnails).

```bash
npm run fetch-boxart        # Download box art
npm run fetch-screenshots   # Download screenshots

# See all options
npm run fetch-boxart -- --help
```

## Tech Stack

- [Svelte 5](https://svelte.dev/) with runes
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

## Project Structure

```
retro-gaming-app/
├── public/
│   ├── boxart/          # Downloaded box art images
│   └── screenshots/     # Downloaded game screenshots
├── scripts/
│   └── fetch-boxart.js  # Box art download script
├── src/
│   ├── lib/
│   │   ├── data.js          # Game database & platform config
│   │   ├── descriptions.js  # Curated game descriptions
│   │   ├── GameCard.svelte
│   │   └── BoxArt.svelte
│   ├── App.svelte       # Main app component
│   └── app.css          # Global styles
└── package.json
```
