// handleLook is needed to describe the new room.
// In checkRoomTriggers?

// engine.js exports handleLook. But if engine imports move.js, and move.js imports engine.js...
// We can pass `system.executeCommand` or `system.handleLook` if we want to avoid direct import,
// OR we can extract handleLook too (but handleLook is core engine logic).

// Let's look at how take.js does it.
// take.js doesn't seem to call back into engine for major state changes that require re-rendering EXCEPT via logs.
// But `handleInventory` (in commands/inventory.js) doesn't import from engine.

// `handleGo` calls `handleLook(null, false, system)` (line 346 of engine.js).
// It also calls `checkRoomTriggers(system)`.

// To avoid circular dependency, we should expect `system` to contain `handleLook` or pass a callback.
// In `engine.js` line 64, `injectedSystem` has { dungeon, writeLog, executeCommand, clearLog }.
// We should add `handleLook` to the system object or make it available.

export function handleMove(system, target) {
  const { dungeon, writeLog, handleLook, checkRoomTriggers } = system;

  if (!target) {
    writeLog("Usage: go [direction]");
    return;
  }

  const room = dungeon.world.rooms[dungeon.currentRoom];
  // Directions are usually stored in lowercase in exits
  const dir = target.toLowerCase();
  const nextRoomId = room.exits[dir];

  // Check Locks
  if (room.locks && room.locks[dir]) {
    const lock = room.locks[dir];
    const hasKey = dungeon.inventory.some((i) => i.id === lock.keyId);

    if (hasKey) {
      // Find key name for flavor text
      const keyItem = dungeon.inventory.find((i) => i.id === lock.keyId);

      // CHECK BACKPACK REQUIREMENT (Hardcoded game logic for 'up')
      // "Up" usually implies going to a new sector/level
      const hasBackpack = dungeon.inventory.some(
        (i) => i.id === "backpack_starter" || i.type === "PACK"
      );

      if (!hasBackpack && dir === "up") {
        writeLog(
          "The elevator door opens, but you fumble with your stack of cartridges. They are about to spill everywhere.",
          "error"
        );
        writeLog(
          `"Careful!" The Archivist steps out from the shadows.`,
          "response"
        );
        writeLog(
          `"You cannot ascend to the higher levels with your hands full. The transfer protocols require containment. Take this."`
        );

        const pack = {
          id: "backpack_starter",
          name: "Infinite Backpack",
          type: "PACK",
          description: "Bigger on inside.",
          contents: [],
        };
        dungeon.inventory.push(pack);
        writeLog(`The Archivist gives you an ${pack.name}.`, "success");
        writeLog(
          "You quickly organize your collection. The elevator awaits.",
          "dim"
        );

        // Proceed with unlock
        writeLog(
          `*CLICK* The ${keyItem ? keyItem.name : "key"} is accepted.`,
          "info"
        );
        delete room.locks[dir];
        // Continue to move logic below (fall through)
      } else {
        // Standard Unlock
        writeLog(
          `*CLICK* The ${keyItem ? keyItem.name : "key"} turns!`,
          "info"
        );
        delete room.locks[dir];
      }
    } else {
      writeLog(lock.msg, "error");
      return; // STOP
    }
  }

  if (nextRoomId) {
    dungeon.currentRoom = nextRoomId;

    // We need to trigger look and triggers.
    // If system provides these functions, use them.
    if (handleLook) handleLook(null, false, system);
    if (checkRoomTriggers) checkRoomTriggers(system);
  } else {
    writeLog(`You cannot go '${target}' from here.`);
  }
}
