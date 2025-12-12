# Phase 4 Implementation Plan: NPC System

## Objective

Populate the world with interactive characters ("Hosts") who can converse, trade, or give hints.

## 1. Data Structure (`npcs.js`)

Define the `NPC` interface and the roster of characters:

- **The Archivist**: Guide, tutorial helper.
- **The Glitch**: Chaos factor, moves around randomly.
- **The Merchant**: Trades currency/items (future).

```javascript
{
    id: 'archivist',
    name: 'The Archivist',
    description: 'An elderly figure made of floating code fragments.',
    dialogue: {
        'default': ["Greetings, explorer.", "The archives are vast."],
        'keywords': {
            'sonic': "Ah, the blue blur. A classic choice.",
            'warp': "Be careful with portals."
        }
    },
    location: 'ARCADE_HUB'
}
```

## 2. Interaction Engine

- Add `TALK <npc>` command.
- Add `ASK <npc> ABOUT <topic>` command.

## 3. Placement

- Update `generator.js` to spawn NPCs in specific zones or hubs.
- Store NPC state in `dungeon.world.npcs`.

## 4. Implementation Steps

1.  Create `src/lib/dungeon/content/npcs.js`.
2.  Update `engine.js` with `handleTalk`.
3.  Inject NPCs into the world generation process.
