# Phase 2 Implementation Plan: World Generator

## Objective

Convert the static game list into a procedurally generated dungeon graph, implementing the algorithms defined in the PRD.

## 1. File Structure

```text
src/lib/dungeon/
├── generation/
│   ├── generator.js        # Main orchestration (The "Builder")
│   ├── distribution.js     # Distribute games to zones (The "Placer")
│   ├── templates.js        # Room definitions/themes
│   └── validator.js        # Graph connectivity check
└── processing/             # (Future)
```

## 2. Implementation Steps

### Step 1: Zone Definition (`templates.js`)

Define the 8 zones from the PRD (`Arcade Atrium`, `Platformer Peaks`, etc.) and their mapping to our actual genres in `data.js`.

- Map "Action" -> "Pixel Warzone"
- Map "RPG" -> "RPG Archives"
- etc.

### Step 2: The Distribution Algorithm (`distribution.js`)

Implement `distributeGames(allGames)`:

1.  Group games by Genre.
2.  Assign ~70% of games to their matching Theme Zone.
3.  Scatter the remaining 30% randomly (chaos factor).
4.  Mark "Hidden Gems" for special placement (secret rooms).

### Step 3: The Generator Core (`generator.js`)

Function `generateDungeon(seed)`:

1.  Init `SeededRandom`.
2.  Create the `ZoneGraph` (connecting the 8 zones).
3.  For each Zone:
    - Generate `Room` nodes (Entrance, Hallways, Hubs).
    - Place the distributed games into these rooms as `Items`.
4.  Link the rooms (Edges).
5.  Return the `WorldState`.

### Step 4: The Validator (`validator.js`)

Ensure the graph is traversable.

- Run a BFS from "Start" (`Arcade Atrium`).
- Ensure all Rooms are reachable. (We will skip complex Key/Lock validation for this MVP step, just pure connectivity).

### Step 5: Integration

- Update `store.svelte.js` to call `generateDungeon()` on init.
- Update `engine.js`'s `handleLook` to show the _actual_ room description.
- Update `engine.js`'s `handleGo` to follow the graph edges.

## 3. Data Structure (World)

```javascript
{
  zones: { 'ARCADE': { ... } },
  rooms: {
    'room_01': {
        id: 'room_01',
        name: 'Neon Entrance',
        description: '...',
        exits: { north: 'room_02' },
        items: [{ type: 'GAME', id: 'sonic_1' }]
    }
  },
  playerStart: 'room_01'
}
```
