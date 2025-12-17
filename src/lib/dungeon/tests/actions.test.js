import { describe, it, expect, beforeEach, mock } from "bun:test";
import { executeInteraction } from "../actions.js";

describe("Action System", () => {
  let dungeon;
  let writeLog;
  let executeCommand;
  let system;

  beforeEach(() => {
    // Mock State
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

    // Mock Functions
    writeLog = mock((msg, type) => {});
    executeCommand = mock((cmd) => {});

    system = { dungeon, writeLog, executeCommand };
  });

  it("should return false if target not found", async () => {
    const handled = await executeInteraction(
      system,
      "USE",
      "nonexistent",
      null
    );
    expect(handled).toBe(false);
  });

  it("should execute interaction on explicit target", async () => {
    const item = {
      id: "item1",
      name: "Test Item",
      interactions: {
        USE: [
          {
            actions: [{ type: "message", content: "Used!" }],
          },
        ],
      },
    };
    dungeon.inventory.push(item);

    const handled = await executeInteraction(system, "USE", "Test Item", null);

    expect(handled).toBe(true);
    expect(writeLog).toHaveBeenCalledWith("Used!", "response");
  });

  it("should fail if test requirement is not met", async () => {
    const item = {
      id: "locked_item",
      name: "Locked Box",
      interactions: {
        OPEN: [
          {
            tests: [{ type: "item", id: "key", context: "inventory" }],
            actions: [{ type: "message", content: "Open!" }],
          },
        ],
      },
    };
    dungeon.world.rooms.room1.items.push(item);

    const handled = await executeInteraction(
      system,
      "OPEN",
      "Locked Box",
      null
    );

    // Should pass checkTests? No, checkTests returns false, so loop continues to next handler.
    // If no handlers pass, it returns false?
    // Wait, executeInteraction iterates handlers. If none match, it returns false (implicitly? No, `return false` at end).
    expect(handled).toBe(false);
    expect(writeLog).not.toHaveBeenCalled();
  });

  it("should pass if test requirement is met", async () => {
    const key = { id: "key", name: "Key" };
    dungeon.inventory.push(key);

    const item = {
      id: "locked_item",
      name: "Locked Box",
      interactions: {
        OPEN: [
          {
            tests: [{ type: "item", id: "key", context: "inventory" }],
            actions: [{ type: "message", content: "Open!" }],
          },
        ],
      },
    };
    dungeon.world.rooms.room1.items.push(item);

    const handled = await executeInteraction(
      system,
      "OPEN",
      "Locked Box",
      null
    );

    expect(handled).toBe(true);
    expect(writeLog).toHaveBeenCalledWith("Open!", "response");
  });

  it("should infer implicit target from verb", async () => {
    const item = {
      id: "lamp",
      name: "Lamp",
      interactions: {
        RUB: [{ actions: [{ type: "message", content: "Genie appears!" }] }],
      },
    };
    dungeon.inventory.push(item);

    const handled = await executeInteraction(system, "RUB", null, null);

    expect(handled).toBe(true);
    expect(writeLog).toHaveBeenCalledWith("Genie appears!", "response");
  });

  it("should ask for clarification if multiple implicit targets exist", async () => {
    const lamp1 = {
      id: "lamp1",
      name: "Brass Lamp",
      interactions: { RUB: [] },
    };
    const lamp2 = {
      id: "lamp2",
      name: "Silver Lamp",
      interactions: { RUB: [] },
    };
    dungeon.inventory.push(lamp1, lamp2);

    const handled = await executeInteraction(system, "RUB", null, null);

    expect(handled).toBe(true); // handled by asking
    expect(writeLog).toHaveBeenCalledWith(
      expect.stringContaining("Which one?"),
      "dim"
    );
  });

  it("should handle 'spawn' and 'destroy' actions", async () => {
    const apple = {
      id: "apple",
      name: "Apple",
      interactions: {
        EAT: [
          {
            actions: [
              { type: "message", content: "Yum!" },
              {
                type: "spawn",
                location: "inventory",
                item: { id: "core", name: "Core" },
              },
              { type: "destroy", target: "self" },
            ],
          },
        ],
      },
    };
    dungeon.inventory.push(apple);

    await executeInteraction(system, "EAT", "Apple", null);

    expect(dungeon.inventory.find((i) => i.id === "apple")).toBeUndefined();
    expect(dungeon.inventory.find((i) => i.id === "core")).toBeDefined();
  });

  it("should handle implicit tool inference (USE X -> implicit tool)", async () => {
    // e.g. "Use Sweep" (verb) on Dust (target) using Broom (implicit tool)
    // Or rather: "Sweep Dust". Verb: SWEEP, Target: Dust.
    // And Broom has interaction "SWEEP" with test `context: 'tool'`.

    // "Use Broom" logic in code:
    // If target (Broom) doesn't handle verb (USE), treat Broom as Tool?
    // And search for other items that use it.

    const broom = { id: "broom", name: "Broom" };
    const dust = {
      id: "dust",
      name: "Dust",
      interactions: {
        USE: [
          {
            tests: [{ type: "item", id: "broom", context: "tool" }],
            actions: [{ type: "message", content: "Cleaned!" }],
          },
        ],
      },
    };

    dungeon.inventory.push(broom);
    dungeon.world.rooms.room1.items.push(dust); // Cleaned things usually in room

    // User types "Use Broom" (Verb: USE, Target: Broom)
    const handled = await executeInteraction(system, "USE", "Broom", null);

    expect(handled).toBe(true);
    expect(writeLog).toHaveBeenCalledWith("(using on Dust)", "dim");
    expect(writeLog).toHaveBeenCalledWith("Cleaned!", "response");
  });
});
