# Phase 5 Implementation Plan: Puzzles & Locks

## Objective

Add barriers to exploration that require player agency to solve. This includes locked doors (requiring keys) and containers.

## 1. Data Structures

Update `Room` and `Exits` to support locking mechanisms.

```javascript
// Exit definition
{
    targetId: 'room_123',
    locked: true,
    keyId: 'red_key',
    description: 'A heavy iron door blocks the way.'
}
```

## 2. Item Factory

Create a `Key` item type and sprinkle them in the world generator.

- **Red Key**: Unlocks "Warzone" areas.
- **Blue Key**: Unlocks "Archives" areas.

## 3. Game Logic Updates

- **Move (GO)**: Check if exit is locked. If text, fail movement and print description.
- **Unlock**: Support `USE <item>` or auto-unlock if key is in inventory.

## 4. Implementation Steps

1.  Update `generator.js` to occasionally lock exits between zones (e.g., locking Zone 3 behind a key found in Zone 2).
2.  Create `keys.js` item definitions.
3.  Update `engine.js` `handleGo` to check locks.
4.  Add `USE` command (optional, or just auto-use for QoL).
