# Phase 6 Implementation Plan: Rich Content & Packs

## Objective

Enhanced the descriptive quality of the world and introduce "Retro Packs" (containers) to group games.

## 1. Description System Upgrade

- Replace "You are back here" with a truncated version of the full description (first sentence).
- Implement a `DescriptionGenerator` that combines template parts (Atmosphere + Feature + Detail) for non-hub rooms to create variety.

## 2. Item Combinations (Packs)

- Introduce `PACK` item type.
- Packs contain a list of `gameIds`.
- `EXAMINE PACK`: Lists the contents.
- `OPEN PACK` (or just `TAKE` content): Spills items into inventory? Or keeps them in pack?
  - _Decision_: Packs are containers. `OPEN PACK` spills contents into the room.

## 3. Improved Examine

- Ensure `EXAMINE <item>` works for both Room items and Inventory items.
- Show metadata (Year, Genre, Notes) when examining a game.

## 4. Implementation Steps

1.  Update `engine.js` `handleLook` to parse the description for a "Short" version (split by period).
2.  Update `engine.js` `handleExamine` to look in inventory AND room.
3.  Update `generator.js` to occasionally bundle 3-5 games into a "Bundle Item" instead of loose cartridges.
