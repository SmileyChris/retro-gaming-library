import { describe, it, expect, beforeEach, mock } from "bun:test";
import { executeInteraction, checkTests, processActions } from "../actions.js";
// We need the engine to support 'spawn', 'destroy', 'modify' which are in actions.js
// AND we need the system context.

// Mock executeCommand to track side effects
const mockExecuteCommand = mock(async () => {});

describe("Smart Items Logic", () => {
  let dungeon;
  let writeLog;
  let system;
  let logs = [];

  beforeEach(() => {
    logs = [];
    dungeon = {
      world: {
        rooms: {
          room1: {
            id: "room1",
            items: [],
          },
        },
      },
      currentRoom: "room1",
      inventory: [],
      flags: new Set(),
    };

    writeLog = mock((msg, type) => {
      logs.push({ msg, type });
    });

    mockExecuteCommand.mockClear();

    system = { dungeon, writeLog, executeCommand: mockExecuteCommand };
  });

  it("should handle 'Dusty Cartridge' cleaning (Self-Transform)", async () => {
    // Logic from generator.js: Dusty Item transforms into Game Item on USE
    const realGame = { id: "game_real", name: "Clean Game", type: "GAME" };

    const dustyItem = {
      id: "dusty_cart",
      name: "Dusty Cartridge",
      interactions: {
        USE: [
          {
            actions: [
              { type: "message", content: "You blow the dust off." },
              { type: "spawn", location: "inventory", item: realGame },
              { type: "destroy", target: "self" },
            ],
          },
        ],
      },
    };

    dungeon.inventory.push(dustyItem);

    // Act
    const handled = await executeInteraction(
      system,
      "USE",
      "Dusty Cartridge",
      null
    );

    // Assert
    expect(handled).toBe(true);
    expect(logs.find((l) => l.msg.includes("blow the dust"))).toBeTruthy();
    expect(dungeon.inventory).not.toContain(dustyItem); // Destroyed
    expect(dungeon.inventory.some((i) => i.id === "game_real")).toBe(true); // Spawned
  });

  it("should handle 'Locked Cabinet' logic (Token Unlock)", async () => {
    // Logic: Cabinet blocked OPEN unless Token USED.
    // Actually generator has complex OPEN check. Let's test standard "USE Key on Lock" pattern.

    const gameInside = { id: "game_inside", name: "Rare Game", hidden: true };

    const cabinet = {
      id: "cabinet",
      name: "Display Cabinet",
      description: "Locked.",
      interactions: {
        USE: [
          {
            tests: [{ type: "item", id: "token", context: "tool" }],
            actions: [
              { type: "message", content: "Unlocked!" },
              {
                type: "modify",
                target: "self",
                updates: { description: "Open." },
              },
              {
                type: "modify",
                targetId: "game_inside",
                updates: { hidden: false },
              },
              { type: "destroy", target: "tool" },
            ],
          },
        ],
      },
    };

    const token = { id: "token", name: "Token" };

    dungeon.world.rooms.room1.items.push(cabinet, gameInside); // Game is in room but hidden
    dungeon.inventory.push(token);

    // Act: Use Token on Cabinet
    // executeInteraction(system, verb, targetName, toolName)
    const handled = await executeInteraction(
      system,
      "USE",
      "Display Cabinet",
      "Token"
    );

    expect(handled).toBe(true);
    expect(logs.find((l) => l.msg.includes("Unlocked"))).toBeTruthy();

    // Verify changes
    expect(cabinet.description).toBe("Open."); // Modified self
    expect(gameInside.hidden).toBe(false); // Modified other by ID
    expect(dungeon.inventory).not.toContain(token); // Destroyed tool
  });

  it("should handle 'High Shelf' logic (Look reveals, Broom acquires)", async () => {
    // 1. Setup
    const gameOnShelf = {
      id: "game_high",
      name: "High Game",
      hidden: true,
      interactions: {
        USE: [
          {
            tests: [{ type: "item", id: "broom", context: "tool" }],
            actions: [
              { type: "message", content: "Knocked down!" },
              {
                type: "spawn",
                location: "inventory",
                item: { id: "game_high", name: "High Game" },
              }, // simplified copy
              { type: "destroy", target: "self" },
            ],
          },
        ],
      },
    };

    const shelf = {
      id: "shelf",
      name: "High Shelf",
      onLook: {
        actions: [
          { type: "modify", targetId: "game_high", updates: { hidden: false } },
        ],
      },
    };

    const broom = { id: "broom", name: "Broom" };

    dungeon.world.rooms.room1.items.push(shelf, gameOnShelf);
    dungeon.inventory.push(broom);

    // 2. Act: Look at Shelf (Reveals Game)
    // We manually invoke processActions since handleLook calls it manually for onLook
    // But we can simulate what engine.js does:
    await processActions(system, shelf.onLook.actions, {
      target: shelf,
      verb: "LOOK",
    });

    expect(gameOnShelf.hidden).toBe(false);

    // 3. Act: Use Broom on High Game
    const handled = await executeInteraction(
      system,
      "USE",
      "High Game",
      "Broom"
    );

    expect(handled).toBe(true);
    expect(logs.find((l) => l.msg.includes("Knocked down"))).toBeTruthy();
    expect(dungeon.inventory.some((i) => i.id === "game_high")).toBe(true);
    expect(dungeon.world.rooms.room1.items).not.toContain(gameOnShelf);
  });
});
