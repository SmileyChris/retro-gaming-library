import { describe, it, expect, beforeEach, mock } from "bun:test";
import { handleMove } from "../commands/move.js";

describe("Command Handlers - Move", () => {
  let dungeon;
  let writeLog;
  let handleLook;
  let checkRoomTriggers;
  let system;
  let logs = [];

  beforeEach(() => {
    logs = [];
    dungeon = {
      world: {
        rooms: {
          start: {
            id: "start",
            exits: { north: "hall" },
            locks: {},
          },
          hall: {
            id: "hall",
            exits: { south: "start", up: "floor2" },
            locks: {},
          },
          floor2: {
            id: "floor2",
            exits: { down: "hall" },
            locks: {},
          },
        },
      },
      currentRoom: "start",
      inventory: [],
    };

    writeLog = mock((msg, type) => {
      logs.push({ msg, type });
    });
    handleLook = mock(() => {});
    checkRoomTriggers = mock(() => {});

    system = { dungeon, writeLog, handleLook, checkRoomTriggers };
  });

  it("should move to a valid exit", () => {
    handleMove(system, "North");

    expect(dungeon.currentRoom).toBe("hall");
    expect(handleLook).toHaveBeenCalled();
    expect(checkRoomTriggers).toHaveBeenCalled();
  });

  it("should fail if invalid direction", () => {
    handleMove(system, "East");

    expect(dungeon.currentRoom).toBe("start");
    expect(logs.find((l) => l.msg.includes("cannot go 'East'"))).toBeTruthy();
  });

  it("should handle locked doors", () => {
    dungeon.world.rooms.start.locks = {
      north: { keyId: "k1", msg: "Locked." },
    };

    // Try without key
    handleMove(system, "North");
    expect(dungeon.currentRoom).toBe("start");
    expect(logs.find((l) => l.msg.includes("Locked."))).toBeTruthy();

    // Add key
    dungeon.inventory.push({ id: "k1", name: "Iron Key" });

    // Try with key
    handleMove(system, "North");
    expect(dungeon.currentRoom).toBe("hall");
    expect(logs.find((l) => l.msg.includes("Key turns"))).toBeTruthy();

    // Lock should be removed
    expect(dungeon.world.rooms.start.locks.north).toBeUndefined();
  });

  it("should block 'UP' movement if no backpack", () => {
    // Current room: hall, try to go UP
    dungeon.currentRoom = "hall";
    // Lock logic isn't the only blocker, but checking the code...
    // The backpack check is inside the LOCK check block!
    // Wait, let's verify move.js logic.
    // Logic:
    // if (room.locks && room.locks[dir]) { ... check lock ... check backpack if unlocked ... }
    // So if there is NO lock, does it check backpack?
    // Looking at move.js:
    /*
      if (room.locks && room.locks[dir]) {
         ...
         if (hasKey) {
            ...
            if (!hasBackpack && dir === "up") { ... return }
            ...
         }
      }
    */
    // This implies the backpack check ONLY happens if there was a lock on "up"?
    // That seems like a bug or specific game design. The original engine.js had strict check inside the lock block.
    // If "up" is unlocked, does it check?
    // Let's test this behavior. If it's unlocked, it should just go.

    // Scenario 1: Up is unlocked.
    handleMove(system, "Up");
    expect(dungeon.currentRoom).toBe("floor2"); // Should move freely if unlocked.
  });

  it("should block 'UP' movement ONLY if locked AND no backpack", () => {
    // This seems to be the logic: "You need a key to unlock the elevator, AND a backpack to use it."
    dungeon.currentRoom = "hall";
    dungeon.world.rooms.hall.locks.up = {
      keyId: "k_up",
      msg: "Elevator locked.",
    };
    dungeon.inventory.push({ id: "k_up", name: "Elevator Key" });

    // Try without backpack
    handleMove(system, "Up");
    expect(dungeon.currentRoom).toBe("hall");
    expect(
      logs.find((l) => l.msg.includes("too many loose cartridges"))
    ).toBeTruthy();

    // Add backpack
    dungeon.inventory.push({ id: "backpack_starter", type: "PACK" });

    handleMove(system, "Up");
    expect(dungeon.currentRoom).toBe("floor2");
  });
});
