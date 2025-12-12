# Dungeon Progression & Game Loop

This document outlines the player's journey through the Retro Library, detailing the critical path, puzzles, and mechanics for each zone.

## 1. The Core Loop

The game follows a recursive loop of **Exploration -> Collection -> Unlocking -> Progression**.

1.  **Dungeon Crawl**: Explore a generated zone (text-based).
2.  **Loot**: Collect cartridges, loose or in packs.
3.  **NPC Quest**: Talk to the zone's NPC to identify a specific "Key Item" or "Console" needed.
4.  **Solve**: Find the specific items (often behind simple puzzles or in specific sub-rooms).
5.  **Reward**: Receive a **Zone Key** or **Console**.
6.  **Elevate**: Use the Elevator to move to the next vertical sector (Zone level + 1).

---

## 2. Detailed Walkthrough (The "Happy Path")

### Zone 1: The Arcade Atrium (The Tutorial)

- **Theme**: Neon-lit arcade, cabinet rows, maintenance alleys.
- **Structure**: Star Topology (Hub + North, East, West rooms).
- **Goal**: Prove worthiness to the Archivist.
- **Key Items Paced**:
  1.  **Broom** (Tool): Found in _Maintenance Alley_ (West). Use to get High Shelf game.
  2.  **Token** (Tool): Found in _Maintenance Alley_ (West). Use to open Locked Cabinet.
  3.  **Realm Cartridge** (e.g., _Sonic 2_): Hidden in one of the rooms.
  4.  **Gem Cartridge**: Hidden in one of the rooms.
- **Step-by-Step**:
  1.  Spawn at `Start Gate`. Move **North** to `Arcade Hub`.
  2.  Talk to **The Archivist**. He demands **5 Cartridges** to stabilize the sector.
  3.  Explore **West** (`Maintenance Alley`). Pick up **Broom** and **Token**.
  4.  Explore **North** (`Main Gallery`). Use **Broom** to knock down game from high shelf. Collect it.
  5.  Explore **East** (`Side Arcade`). Use **Token** to unlock display case. Collect game.
  6.  Collect remaining loose games until inventory has 5.
  7.  Return to **Hub**. Talk to **Archivist**.
  8.  **Reward**: Receive `Elevator Key (Level 1)`.
  9.  Attempt to go **Up** (Elevator). **FAIL**: "Too many loose carts."
  10. Talk to **Archivist** again. **Reward**: `Infinite Backpack`.
  11. Go **Up**.

### Zone 2: Platformer Peaks

- **Theme**: Floating islands, clouds, pipes.
- **Structure**: Linear Strip or Branching Path.
- **Goal**: obtain a Console to play the Realm Game found in Zone 1.
- **NPC**: **Retro Rob (Merchant)**.
- **Step-by-Step**:
  1.  Arrive from Elevator.
  2.  Locate **Retro Rob**.
  3.  **Quest**: He lost a "Gem Quality" game in the Arcade (Zone 1).
  4.  **Action**: You should already have this from Zone 1. Talk to him again to hand it over.
  5.  **Reward**: **Sega Genesis Console** (Fixed).
  6.  **Mechanic**: Now you can `play [Realm Game]` (e.g., `play sonic 2`).
  7.  **Realm**: Enter the _Sonic 2_ cartridge. Complete the "Chemical Plant" loop challenge.
  8.  **Reward**: `Elevator Key (Level 2)` (Found inside the Realm).
  9.  Go **Up**.

### Zone 3: RPG Archives (Planned)

- **Theme**: Dusty bookshelves, quiet study, mystical.
- **NPC**: **Keeper of Lore**.
- **Quest**: Fetch a specific RPG title.

---

## 3. Mechanics & Systems

### Inventory Management

- **Loose Items**: Clutter the inventory. Cannot use Elevator with too many.
- **Backpack**: Automatically stores `GAME` type items. Viewing specific games requires `use backpack` or `open backpack`.

### Environmental Puzzles (`USE`)

The `use` command is context-sensitive:

- `use [tool]` (e.g., `use broom`): Checks if the current room has an item requiring that tool.
- `use [object]` (e.g., `use backpack`): Triggers the object's primary function.

### Realms

Specific cartridges are "Gateways".

- Identified by special metadata or descriptions.
- Command: `play [game name]`.
- Requires: Specific **Console** in inventory.
- Gameplay: Switches to a mini-text-adventure based on that game's mechanics (e.g., "Jump", "Spin" commands).
