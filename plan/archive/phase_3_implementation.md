# Phase 3 Implementation Plan: Inventory & Interaction

## Objective

Make the world interactive. Users should be able to collect artifacts (games) and manage their inventory. This prepares the foundation for future "quests" or puzzles without needing the complex Game Realm system yet.

## 1. Inventory System

- **Store**: Use `dungeon.inventory` (Array of items).
- **Commands**:
  - `TAKE <item>`: Move item from Room -> Inventory.
  - `DROP <item>`: Move item from Inventory -> Room.
  - `INVENTORY` / `I`: List carried items.

## 2. Object Persistence

- Items must persist their location (Room vs Inventory).
- `handleLook` must filter out picked-up items.

## 3. "Take" Logic

1.  Find item in `dungeon.world.rooms[current].items`.
2.  Remove from room array.
3.  Push to `dungeon.inventory`.
4.  Log success message.

## 4. "Drop" Logic

1.  Find item in `dungeon.inventory`.
2.  Remove from inventory array.
3.  Push to `dungeon.world.rooms[current].items`.
4.  Log success message.
